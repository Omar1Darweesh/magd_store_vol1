import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expenses.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // ============= Categories =============
  async createCategory(dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        color: dto.color || '#6366f1',
        icon: dto.icon || 'Wallet',
        active: dto.active ?? true,
      },
    });
  }

  async findAllCategories(options?: { active?: boolean }) {
    const where: Prisma.ExpenseCategoryWhereInput = {};
    if (options?.active !== undefined) {
      where.active = options.active;
    }
    return this.prisma.expenseCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });
  }

  async findOneCategory(id: number) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(id: number, dto: UpdateExpenseCategoryDto) {
    await this.findOneCategory(id);
    return this.prisma.expenseCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: number) {
    const category = await this.findOneCategory(id);
    if (category._count.expenses > 0) {
      throw new BadRequestException('Cannot delete category with expenses. Please reassign or delete expenses first.');
    }
    return this.prisma.expenseCategory.delete({ where: { id } });
  }

  async toggleCategoryActive(id: number) {
    const category = await this.findOneCategory(id);
    return this.prisma.expenseCategory.update({
      where: { id },
      data: { active: !category.active },
    });
  }

  // ============= Expenses =============
  private async generateExpenseNo(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `EXP-${year}${month}-`;
    
    const lastExpense = await this.prisma.expense.findFirst({
      where: {
        expenseNo: { startsWith: prefix },
      },
      orderBy: { expenseNo: 'desc' },
    });

    let nextNum = 1;
    if (lastExpense) {
      const lastNum = parseInt(lastExpense.expenseNo.replace(prefix, '')) || 0;
      nextNum = lastNum + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async create(dto: CreateExpenseDto, userId: number) {
    // Validate category exists
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (!category.active) throw new BadRequestException('Category is inactive');

    const expenseNo = await this.generateExpenseNo();

    return this.prisma.expense.create({
      data: {
        expenseNo,
        categoryId: dto.categoryId,
        amount: dto.amount,
        description: dto.description,
        expenseDate: new Date(dto.expenseDate),
        paymentMethod: dto.paymentMethod as any || 'CASH',
        reference: dto.reference,
        notes: dto.notes,
        attachmentUrl: dto.attachmentUrl,
        isRecurring: dto.isRecurring || false,
        recurringDay: dto.recurringDay,
        createdBy: userId,
      },
      include: {
        category: true,
        user: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    categoryId?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentMethod?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const where: Prisma.ExpenseWhereInput = {};

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options?.search) {
      where.OR = [
        { expenseNo: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
        { reference: { contains: options.search, mode: 'insensitive' } },
        { notes: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.dateFrom || options?.dateTo) {
      where.expenseDate = {};
      if (options.dateFrom) {
        where.expenseDate.gte = new Date(options.dateFrom);
      }
      if (options.dateTo) {
        where.expenseDate.lte = new Date(options.dateTo);
      }
    }

    if (options?.paymentMethod) {
      where.paymentMethod = options.paymentMethod as any;
    }

    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'desc';
    const orderBy: Prisma.ExpenseOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 20,
        orderBy,
        include: {
          category: true,
          user: {
            select: { id: true, fullName: true, username: true },
          },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: number) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        user: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(id: number, dto: UpdateExpenseDto) {
    await this.findOne(id);
    
    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    const updateData: any = { ...dto };
    if (dto.expenseDate) {
      updateData.expenseDate = new Date(dto.expenseDate);
    }

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        user: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });
  }

  async delete(id: number) {
    await this.findOne(id);
    return this.prisma.expense.delete({ where: { id } });
  }

  // ============= Statistics =============
  async getStats(options?: { dateFrom?: string; dateTo?: string }) {
    const where: Prisma.ExpenseWhereInput = {};
    
    if (options?.dateFrom || options?.dateTo) {
      where.expenseDate = {};
      if (options.dateFrom) where.expenseDate.gte = new Date(options.dateFrom);
      if (options.dateTo) where.expenseDate.lte = new Date(options.dateTo);
    }

    // Total expenses
    const totalResult = await this.prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    // Today's expenses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayResult = await this.prisma.expense.aggregate({
      where: {
        ...where,
        expenseDate: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
      _count: true,
    });

    // This month's expenses
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    
    const monthResult = await this.prisma.expense.aggregate({
      where: {
        expenseDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
      _sum: { amount: true },
      _count: true,
    });

    // By category
    const byCategory = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const categories = await this.prisma.expenseCategory.findMany();
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const byCategoryWithNames = byCategory.map(item => ({
      categoryId: item.categoryId,
      categoryName: categoryMap.get(item.categoryId)?.name || 'Unknown',
      categoryNameAr: categoryMap.get(item.categoryId)?.nameAr || 'غير معروف',
      color: categoryMap.get(item.categoryId)?.color || '#6366f1',
      total: item._sum.amount,
      count: item._count,
    }));

    // By payment method
    const byPaymentMethod = await this.prisma.expense.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    // Recurring expenses
    const recurringCount = await this.prisma.expense.count({
      where: { ...where, isRecurring: true },
    });

    return {
      totalExpenses: totalResult._sum.amount || 0,
      totalCount: totalResult._count,
      todayExpenses: todayResult._sum.amount || 0,
      todayCount: todayResult._count,
      monthExpenses: monthResult._sum.amount || 0,
      monthCount: monthResult._count,
      recurringCount,
      byCategory: byCategoryWithNames,
      byPaymentMethod: byPaymentMethod.map(item => ({
        method: item.paymentMethod,
        total: item._sum.amount,
        count: item._count,
      })),
    };
  }

  // Monthly trend for last 6 months
  async getMonthlyTrend() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const expenses = await this.prisma.expense.findMany({
      where: {
        expenseDate: { gte: sixMonthsAgo },
      },
      select: {
        amount: true,
        expenseDate: true,
      },
    });

    const monthlyData: Record<string, number> = {};
    expenses.forEach(exp => {
      const date = new Date(exp.expenseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = (monthlyData[key] || 0) + Number(exp.amount);
    });

    // Generate last 6 months
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      result.push({
        month: key,
        monthName: monthNames[date.getMonth()],
        total: monthlyData[key] || 0,
      });
    }

    return result;
  }

  // Export data
  async exportExpenses(options?: {
    categoryId?: number;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: Prisma.ExpenseWhereInput = {};
    
    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }
    
    if (options?.dateFrom || options?.dateTo) {
      where.expenseDate = {};
      if (options.dateFrom) where.expenseDate.gte = new Date(options.dateFrom);
      if (options.dateTo) where.expenseDate.lte = new Date(options.dateTo);
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        category: true,
        user: {
          select: { id: true, fullName: true },
        },
      },
    });
  }
}
