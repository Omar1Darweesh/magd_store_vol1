import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTreasuryTransactionDto, TreasuryQueryDto } from './dto/treasury.dto';
import { Prisma, PaymentMethod } from '@prisma/client';

const TRACKED_METHODS: PaymentMethod[] = ['CASH', 'WALLET', 'INSTAPAY', 'TRANSFER', 'CARD', 'FAWRY'];

@Injectable()
export class TreasuryService {
  constructor(private prisma: PrismaService) { }

  // ─── Helpers ────────────────────────────────────────

  private normalizeMethod(raw: string | null | undefined): string {
    const aliases: Record<string, string> = {
      'نقدي': 'CASH', 'كاش': 'CASH',
      'تحويل بنكي': 'TRANSFER', 'تحويل': 'TRANSFER', 'شيك': 'TRANSFER',
      'بطاقة': 'CARD',
      'محفظة': 'WALLET',
      'انستاباي': 'INSTAPAY',
      'فوري': 'FAWRY',
      'أخرى': 'CASH',
    };
    const str = (raw || 'CASH').trim();
    return aliases[str] || str.toUpperCase();
  }

  private dateRange(dateFrom?: string, dateTo?: string) {
    // Accept either a bare date "2026-04-07" or a full ISO "2026-04-07T21:00:00.000Z"
    const from = dateFrom
      ? (dateFrom.includes('T') ? new Date(dateFrom) : new Date(dateFrom + 'T00:00:00'))
      : undefined;
    const to = dateTo
      ? (dateTo.includes('T') ? new Date(dateTo) : new Date(dateTo + 'T23:59:59.999'))
      : undefined;
    if (!from && !to) return undefined;
    return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  private zeroBalance() {
    return { CASH: 0, WALLET: 0, INSTAPAY: 0, TRANSFER: 0, CARD: 0, FAWRY: 0, MIXED: 0 };
  }

  // ─── Summary ─────────────────────────────────────────

  async getSummary(dateFrom?: string, dateTo?: string) {
    const range = this.dateRange(dateFrom, dateTo);

    // 1. Sales income (per payment method)
    const salesIncome = await this.prisma.salesInvoice.groupBy({
      by: ['paymentMethod'],
      _sum: { total: true },
      where: {
        paymentStatus: { in: ['PAID', 'PARTIAL'] },
        ...(range ? { createdAt: range } : {}),
      },
    });

    // 2. Supplier payments (outgoing) — filter by createdAt so business day
    //    boundaries are always respected (paymentDate may be midnight UTC)
    const supplierOut = await this.prisma.supplierPayment.groupBy({
      by: ['method'],
      _sum: { amount: true },
      where: range ? { createdAt: range } : {},
    });

    // 3. Expenses (outgoing, per payment method) — same: use createdAt
    const expenseOut = await this.prisma.expense.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      where: range ? { createdAt: range } : {},
    });

    // 4. Manual treasury transactions — transactionDate is now always new Date()
    //    but use createdAt for safety
    const manualIn = await this.prisma.treasuryTransaction.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      where: {
        type: 'INCOME',
        ...(range ? { createdAt: range } : {}),
      },
    });

    const manualOut = await this.prisma.treasuryTransaction.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      where: {
        type: 'EXPENSE',
        ...(range ? { createdAt: range } : {}),
      },
    });

    // Build balance per method
    const income = { ...this.zeroBalance() } as Record<string, number>;
    const expense = { ...this.zeroBalance() } as Record<string, number>;

    for (const row of salesIncome) {
      const key = row.paymentMethod;
      income[key] = (income[key] || 0) + Number(row._sum.total || 0);
    }

    for (const row of manualIn) {
      const key = row.paymentMethod;
      income[key] = (income[key] || 0) + Number(row._sum.amount || 0);
    }

    // Supplier payments — now uses PaymentMethod enum directly
    for (const row of supplierOut) {
      const key = row.method || 'CASH';
      expense[key] = (expense[key] || 0) + Number(row._sum.amount || 0);
    }

    for (const row of expenseOut) {
      const key = row.paymentMethod;
      expense[key] = (expense[key] || 0) + Number(row._sum.amount || 0);
    }

    for (const row of manualOut) {
      const key = row.paymentMethod;
      expense[key] = (expense[key] || 0) + Number(row._sum.amount || 0);
    }

    // Per-method balances
    const methods = ['CASH', 'WALLET', 'INSTAPAY', 'TRANSFER', 'CARD', 'FAWRY', 'MIXED'];
    const breakdown = methods.map((m) => ({
      method: m,
      income: income[m] || 0,
      expense: expense[m] || 0,
      balance: (income[m] || 0) - (expense[m] || 0),
    }));

    const totalIncome = breakdown.reduce((s, b) => s + b.income, 0);
    const totalExpense = breakdown.reduce((s, b) => s + b.expense, 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      breakdown,
    };
  }

  // ─── Unified transaction feed ─────────────────────────

  async getTransactions(query: TreasuryQueryDto) {
    const page = parseInt(query.page || '1');
    const pageSize = parseInt(query.pageSize || '50');
    const skip = (page - 1) * pageSize;
    const range = this.dateRange(query.dateFrom, query.dateTo);

    // Fetch from all sources in parallel
    const [sales, supplierPayments, expenses, manualEntries] = await Promise.all([
      // Sales invoices as INCOME
      query.type === 'EXPENSE'
        ? []
        : this.prisma.salesInvoice.findMany({
          where: {
            paymentStatus: { in: ['PAID', 'PARTIAL'] },
            ...(range ? { createdAt: range } : {}),
            ...(query.paymentMethod ? { paymentMethod: query.paymentMethod as PaymentMethod } : {}),
          },
          select: {
            id: true,
            invoiceNo: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
            user: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),

      // Supplier payments as EXPENSE — filter by createdAt
      query.type === 'INCOME'
        ? []
        : this.prisma.supplierPayment.findMany({
          where: {
            ...(range ? { createdAt: range } : {}),
          },
          select: {
            id: true,
            amount: true,
            method: true,
            paymentDate: true,
            createdAt: true,
            notes: true,
            supplier: { select: { name: true } },
            user: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),

      // Expenses as EXPENSE — filter by createdAt
      query.type === 'INCOME'
        ? []
        : this.prisma.expense.findMany({
          where: {
            ...(range ? { createdAt: range } : {}),
            ...(query.paymentMethod ? { paymentMethod: query.paymentMethod as PaymentMethod } : {}),
          },
          select: {
            id: true,
            expenseNo: true,
            amount: true,
            paymentMethod: true,
            description: true,
            expenseDate: true,
            createdAt: true,
            category: { select: { nameAr: true, name: true } },
            user: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),

      // Manual treasury transactions — filter by createdAt
      this.prisma.treasuryTransaction.findMany({
        where: {
          ...(query.type ? { type: query.type as any } : {}),
          ...(range ? { createdAt: range } : {}),
          ...(query.paymentMethod ? { paymentMethod: query.paymentMethod as PaymentMethod } : {}),
        },
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Normalize to unified format
    const allEntries: any[] = [
      ...sales.map((s) => ({
        id: `sale-${s.id}`,
        sourceType: 'SALE',
        type: 'INCOME',
        amount: Number(s.total),
        paymentMethod: s.paymentMethod,
        purpose: `مبيعات - فاتورة ${s.invoiceNo}`,
        date: s.createdAt,
        user: s.user?.fullName,
        referenceNo: s.invoiceNo,
      })),
      ...supplierPayments.map((sp) => ({
        id: `supplier-${sp.id}`,
        sourceType: 'SUPPLIER_PAYMENT',
        type: 'EXPENSE',
        amount: Number(sp.amount),
        paymentMethod: sp.method || 'CASH',
        purpose: `دفع للمورد - ${sp.supplier?.name || ''}`,
        date: sp.createdAt,
        user: sp.user?.fullName,
        notes: sp.notes,
      })),
      ...expenses.map((e) => ({
        id: `expense-${e.id}`,
        sourceType: 'EXPENSE',
        type: 'EXPENSE',
        amount: Number(e.amount),
        paymentMethod: e.paymentMethod,
        purpose: `مصروف - ${e.category?.nameAr || e.category?.name || ''}: ${e.description || ''}`,
        date: e.createdAt,
        user: e.user?.fullName,
        referenceNo: e.expenseNo,
      })),
      ...manualEntries.map((m) => ({
        id: `manual-${m.id}`,
        dbId: m.id,
        sourceType: 'MANUAL',
        type: m.type,
        amount: Number(m.amount),
        paymentMethod: m.paymentMethod,
        purpose: m.purpose,
        notes: m.notes,
        date: m.createdAt,
        user: m.user?.fullName,
      })),
    ];

    // Sort all by date desc
    allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = allEntries.length;
    const paginated = allEntries.slice(skip, skip + pageSize);

    return { data: paginated, total, page, pageSize };
  }

  // ─── Daily breakdown for a range ─────────────────────

  async getDailyBreakdown(dateFrom: string, dateTo: string) {
    const range = this.dateRange(dateFrom, dateTo);
    if (!range) return [];

    const [salesByDay, expensesByDay, manualByDay] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT DATE("createdat") as day,
               "paymentmethod" as method,
               SUM(total) as amount
        FROM salesinvoices
        WHERE "createdat" >= ${range.gte} AND "createdat" <= ${range.lte}
          AND "paymentstatus" IN ('PAID', 'PARTIAL')
        GROUP BY DATE("createdat"), "paymentmethod"
        ORDER BY day
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT DATE("expense_date") as day,
               "payment_method" as method,
               SUM(amount) as amount
        FROM expenses
        WHERE "expense_date" >= ${range.gte} AND "expense_date" <= ${range.lte}
        GROUP BY DATE("expense_date"), "payment_method"
        ORDER BY day
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT DATE("transaction_date") as day,
               "payment_method" as method,
               type,
               SUM(amount) as amount
        FROM treasury_transactions
        WHERE "transaction_date" >= ${range.gte} AND "transaction_date" <= ${range.lte}
        GROUP BY DATE("transaction_date"), "payment_method", type
        ORDER BY day
      `,
    ]);

    // Build a map by day
    const dayMap: Record<string, { day: string; income: number; expense: number }> = {};
    const ensureDay = (day: string) => {
      if (!dayMap[day]) dayMap[day] = { day, income: 0, expense: 0 };
    };

    for (const r of salesByDay) {
      const d = r.day instanceof Date ? r.day.toISOString().split('T')[0] : String(r.day);
      ensureDay(d);
      dayMap[d].income += Number(r.amount);
    }

    for (const r of expensesByDay) {
      const d = r.day instanceof Date ? r.day.toISOString().split('T')[0] : String(r.day);
      ensureDay(d);
      dayMap[d].expense += Number(r.amount);
    }

    for (const r of manualByDay) {
      const d = r.day instanceof Date ? r.day.toISOString().split('T')[0] : String(r.day);
      ensureDay(d);
      if (r.type === 'INCOME') dayMap[d].income += Number(r.amount);
      else dayMap[d].expense += Number(r.amount);
    }

    return Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day));
  }

  // ─── Manual transactions CRUD ────────────────────────

  async createManual(dto: CreateTreasuryTransactionDto, userId: number) {
    // Always use the actual current timestamp so the transaction is correctly
    // attributed to the currently open business day, never to a past one.
    return this.prisma.treasuryTransaction.create({
      data: {
        type: dto.type as any,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod as any,
        purpose: dto.purpose,
        notes: dto.notes,
        transactionDate: new Date(),
        isManual: true,
        createdBy: userId,
      },
      include: { user: { select: { fullName: true } } },
    });
  }

  async deleteManual(id: number) {
    return this.prisma.treasuryTransaction.delete({ where: { id } });
  }
}
