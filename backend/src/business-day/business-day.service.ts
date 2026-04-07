import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BusinessDayStatus } from '@prisma/client';

@Injectable()
export class BusinessDayService {
  constructor(private prisma: PrismaService) { }

  async openBusinessDay(userId: number, notes?: string) {
    // Check if there's already an open business day
    const existing = await this.prisma.businessDay.findFirst({
      where: { status: BusinessDayStatus.OPEN },
      include: { opener: { select: { id: true, fullName: true } } },
    });

    if (existing) {
      throw new BadRequestException(
        `يوجد يوم عمل مفتوح بالفعل منذ ${existing.openedAt.toLocaleString('ar-EG')}`,
      );
    }

    const day = await this.prisma.businessDay.create({
      data: {
        openedBy: userId,
        notes,
        status: BusinessDayStatus.OPEN,
      },
      include: {
        opener: { select: { id: true, fullName: true } },
      },
    });

    return day;
  }

  async closeBusinessDay(userId: number, notes?: string) {
    const open = await this.prisma.businessDay.findFirst({
      where: { status: BusinessDayStatus.OPEN },
    });

    if (!open) {
      throw new NotFoundException('لا يوجد يوم عمل مفتوح حالياً');
    }

    const closed = await this.prisma.businessDay.update({
      where: { id: open.id },
      data: {
        closedAt: new Date(),
        closedBy: userId,
        status: BusinessDayStatus.CLOSED,
        notes: notes ?? open.notes,
      },
      include: {
        opener: { select: { id: true, fullName: true } },
        closer: { select: { id: true, fullName: true } },
      },
    });

    return closed;
  }

  async getCurrent() {
    const day = await this.prisma.businessDay.findFirst({
      where: { status: BusinessDayStatus.OPEN },
      include: {
        opener: { select: { id: true, fullName: true } },
      },
    });
    return day ?? null;
  }

  async getHistory(skip = 0, take = 20) {
    const [data, total] = await Promise.all([
      this.prisma.businessDay.findMany({
        orderBy: { openedAt: 'desc' },
        skip,
        take,
        include: {
          opener: { select: { id: true, fullName: true } },
          closer: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.businessDay.count(),
    ]);
    return { data, total };
  }

  async getById(id: number) {
    const day = await this.prisma.businessDay.findUnique({
      where: { id },
      include: {
        opener: { select: { id: true, fullName: true } },
        closer: { select: { id: true, fullName: true } },
      },
    });
    if (!day) throw new NotFoundException(`Business day #${id} not found`);
    return day;
  }

  async getZReport(id: number) {
    const day = await this.prisma.businessDay.findUnique({
      where: { id },
      include: {
        opener: { select: { id: true, fullName: true } },
        closer: { select: { id: true, fullName: true } },
      },
    });
    if (!day) throw new NotFoundException(`Business day #${id} not found`);

    const from = day.openedAt;
    const to = day.closedAt ?? new Date();

    // ── Sales ──────────────────────────────────────────────────
    const invoices = await this.prisma.salesInvoice.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        subtotal: true,
        totalDiscount: true,
        discountAmount: true,
        totalTax: true,
        paymentMethod: true,
        paymentStatus: true,
        paidAmount: true,
        costOfGoods: true,
        grossProfit: true,
        channel: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    });

    const salesTotal = invoices.reduce((s, i) => s + Number(i.total), 0);
    const salesSubtotal = invoices.reduce((s, i) => s + Number(i.subtotal), 0);
    const salesDiscounts = invoices.reduce(
      (s, i) => s + Number(i.totalDiscount) + Number(i.discountAmount),
      0,
    );
    const salesTax = invoices.reduce((s, i) => s + Number(i.totalTax), 0);
    const salesCost = invoices.reduce((s, i) => s + Number(i.costOfGoods ?? 0), 0);
    const salesProfit = invoices.reduce((s, i) => s + Number(i.grossProfit ?? 0), 0);
    const salesPaid = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    for (const inv of invoices) {
      const method = inv.paymentMethod as string;
      paymentBreakdown[method] = (paymentBreakdown[method] ?? 0) + Number(inv.paidAmount);
    }

    // ── Returns ─────────────────────────────────────────────────
    const returns = await this.prisma.salesReturn.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        returnNo: true,
        totalRefund: true,
        createdAt: true,
        salesInvoice: { select: { invoiceNo: true } },
      },
    });
    const returnsTotal = returns.reduce((s, r) => s + Number(r.totalRefund), 0);

    // ── Expenses ─────────────────────────────────────────────────
    const expenses = await this.prisma.expense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
      select: {
        id: true,
        expenseNo: true,
        amount: true,
        description: true,
        paymentMethod: true,
        expenseDate: true,
        category: { select: { name: true, nameAr: true } },
      },
    });
    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

    // Expense breakdown by category
    const expenseByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      const cat = exp.category.nameAr || exp.category.name;
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(exp.amount);
    }

    // ── Net ──────────────────────────────────────────────────────
    const netCash = salesPaid - returnsTotal - expensesTotal;

    return {
      day: {
        id: day.id,
        openedAt: day.openedAt,
        closedAt: day.closedAt,
        status: day.status,
        notes: day.notes,
        opener: day.opener,
        closer: day.closer,
      },
      sales: {
        count: invoices.length,
        subtotal: salesSubtotal,
        discounts: salesDiscounts,
        tax: salesTax,
        total: salesTotal,
        paid: salesPaid,
        costOfGoods: salesCost,
        grossProfit: salesProfit,
        paymentBreakdown,
        invoices,
      },
      returns: {
        count: returns.length,
        total: returnsTotal,
        items: returns,
      },
      expenses: {
        count: expenses.length,
        total: expensesTotal,
        byCategory: expenseByCategory,
        items: expenses,
      },
      summary: {
        totalIncome: salesPaid,
        totalReturns: returnsTotal,
        totalExpenses: expensesTotal,
        netCash,
      },
    };
  }
}
