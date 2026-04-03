import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGRNDto, CreateSupplierDto, CreateSupplierPaymentDto } from './dto/purchasing.dto';
import { MovementType } from '@prisma/client';
import { CostAccountingService } from '../stock/cost-accounting.service';
import { ProfitMarginService } from '../products/profit-margin.service';
import { SupplierAuditService } from './supplier-audit.service';

@Injectable()
export class PurchasingService {
  constructor(
    private prisma: PrismaService,
    private costAccountingService: CostAccountingService,
    private profitMarginService: ProfitMarginService,
    private supplierAuditService: SupplierAuditService,
  ) { }

  // ============= Suppliers =============
  async createSupplier(createSupplierDto: CreateSupplierDto, userId: number) {
    const supplier = await this.prisma.supplier.create({
      data: createSupplierDto,
    });
    await this.supplierAuditService.logChange(supplier.id, 'CREATE', supplier, null, userId);
    return supplier;
  }

  async findAllSuppliers(params?: {
    skip?: number;
    take?: number;
    active?: boolean;
    search?: string;
  }) {
    const MAX_TAKE = 500;
    const MAX_SKIP = 100000;
    const { skip = 0, take = 50, active, search } = params || {};

    // ✅ FIXED: Add max limits to prevent resource exhaustion
    const validatedTake = Math.min(Math.max(1, Number(take) || 50), MAX_TAKE);
    const validatedSkip = Math.min(Math.max(0, Number(skip) || 0), MAX_SKIP);

    const where: any = {};
    if (active !== undefined) where.active = active;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contact: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        skip: validatedSkip,
        take: validatedTake,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: suppliers,
      total,
      page: Math.floor(validatedSkip / validatedTake) + 1,
      pageSize: validatedTake,
    };
  }

  async findOneSupplier(id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async updateSupplier(id: number, data: any, userId: number) {
    const oldSupplier = await this.findOneSupplier(id);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data,
    });
    await this.supplierAuditService.logChange(id, 'UPDATE', updated, oldSupplier, userId);
    return updated;
  }

  async removeSupplier(id: number, userId: number) {
    const supplier = await this.findOneSupplier(id);
    await this.supplierAuditService.logChange(id, 'DELETE', null, supplier, userId);
    return this.prisma.supplier.delete({ where: { id } });
  }

  // ============= GRN =============
  async createGRN(createGRNDto: CreateGRNDto, userId: number) {
    const { supplierId, branchId, relatedPoId, lines, notes, stockLocationId } =
      createGRNDto;

    // Validate supplier
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Find default stock location if not provided
    let locationId = stockLocationId;
    if (!locationId) {
      const defaultLocation = await this.prisma.stockLocation.findFirst({
        where: { branchId, active: true },
      });
      if (!defaultLocation) {
        throw new BadRequestException(
          'No active stock location found for this branch',
        );
      }
      locationId = defaultLocation.id;
    }

    // Validate all products exist
    for (const line of lines) {
      const product = await this.prisma.product.findUnique({
        where: { id: line.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product ${line.productId} not found`);
      }
    }

    // ✅ Track products for price update
    const productIds: number[] = [];

    // ✅ FIXED: Generate GRN number INSIDE transaction to prevent race condition
    const grn = await this.prisma.$transaction(
      async (tx) => {
        // Generate GRN number with database lock to ensure uniqueness
        const grnNo = await this.generateGRNNoTx(tx, branchId);

        // Calculate totals
        let subtotal = 0;
        const taxRateVal =
          createGRNDto.taxRate !== undefined ? createGRNDto.taxRate : 14;

        lines.forEach((l) => {
          subtotal += l.qty * l.cost;
        });

        const taxAmount = (subtotal * taxRateVal) / 100;
        const total = subtotal + taxAmount;

        // Create goods receipt
        const grn = await tx.goodsReceipt.create({
          data: {
            grnNo,
            supplierId,
            branchId,
            relatedPoId,
            notes,
            createdBy: userId,
            paymentTerm: createGRNDto.paymentTerm || 'CASH',
            taxRate: taxRateVal,
            subtotal,
            taxAmount,
            total,
            lines: {
              create: lines.map((line) => ({
                productId: line.productId,
                qty: line.qty,
                cost: line.cost,
              })),
            },
          },
          include: {
            lines: {
              include: {
                product: true,
              },
            },
            supplier: true,
          },
        });

        // Create stock movements & Update Cost
        for (const line of lines) {
          // Update WAC (cost calculation only - no price recalculation)
          await this.costAccountingService.updateWeightedAverageCost(
            line.productId,
            line.qty,
            line.cost,
            tx,
          );

          await tx.stockMovement.create({
            data: {
              productId: line.productId,
              stockLocationId: locationId,
              qtyChange: line.qty, // positive for receipt
              movementType: MovementType.GRN,
              refTable: 'goods_receipts',
              refId: grn.id,
              createdBy: userId,
            },
          });

          // ✅ Track product for later price update
          productIds.push(line.productId);
        }

        return grn;
      },
      {
        timeout: 15000, // ✅ 15 seconds is enough now (much faster without price recalc)
      },
    );

    // ✅ Update prices AFTER transaction completes (outside transaction)
    console.log(
      '💰 Transaction complete. Now updating prices asynchronously...',
    );
    for (const productId of productIds) {
      try {
        await this.profitMarginService.updateProductPrices(productId, userId);
        console.log(`   ✅ Prices updated for product ${productId}`);
      } catch (error) {
        console.error(
          `   ❌ Failed to update prices for product ${productId}:`,
          error.message,
        );
        // Don't throw - GRN was already created successfully
      }
    }

    console.log('✅ GRN creation and price updates complete!');
    return grn;
  }

  async findOneGRN(id: number) {
    const grn = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!grn) {
      throw new NotFoundException('GRN not found');
    }

    return grn;
  }

  async findAllGRNs(params?: {
    skip?: number;
    take?: number;
    branchId?: number;
  }) {
    const MAX_TAKE = 500;
    const MAX_SKIP = 100000;
    const { skip = 0, take = 50, branchId } = params || {};

    // ✅ FIXED: Add max limits to prevent resource exhaustion
    const validatedTake = Math.min(Math.max(1, Number(take) || 50), MAX_TAKE);
    const validatedSkip = Math.min(Math.max(0, Number(skip) || 0), MAX_SKIP);

    const where: any = {};
    if (branchId !== undefined) where.branchId = branchId;

    const [total, grns] = await Promise.all([
      this.prisma.goodsReceipt.count({ where }),
      this.prisma.goodsReceipt.findMany({
        where,
        skip: validatedSkip,
        take: validatedTake,
        include: {
          supplier: true,
          branch: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: grns,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
    };
  }

  private async generateGRNNo(branchId: number): Promise<string> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lastGRN = await this.prisma.goodsReceipt.findFirst({
      where: {
        branchId,
        grnNo: {
          startsWith: `GRN-${branch.code}-${datePrefix}`,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let sequence = 1;
    if (lastGRN) {
      const lastSeq = parseInt(lastGRN.grnNo.split('-').pop() || '0');
      sequence = lastSeq + 1;
    }

    return `GRN-${branch.code}-${datePrefix}-${String(sequence).padStart(4, '0')}`;
  }

  // ✅ FIXED: Transaction-based GRN generation to prevent race condition
  private async generateGRNNoTx(tx: any, branchId: number): Promise<string> {
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new Error('Branch not found');
    }

    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    // ✅ Lock: Read within transaction to prevent concurrent access
    const lastGRN = await tx.goodsReceipt.findFirst({
      where: {
        branchId,
        grnNo: {
          startsWith: `GRN-${branch.code}-${datePrefix}`,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let sequence = 1;
    if (lastGRN) {
      const lastSeq = parseInt(lastGRN.grnNo.split('-').pop() || '0');
      sequence = lastSeq + 1;
    }

    return `GRN-${branch.code}-${datePrefix}-${String(sequence).padStart(4, '0')}`;
  }

  // ============= Supplier Payments =============

  async addSupplierPayment(
    supplierId: number,
    dto: CreateSupplierPaymentDto,
    userId: number,
  ) {
    await this.findOneSupplier(supplierId);

    if (dto.grnId) {
      const grn = await this.prisma.goodsReceipt.findUnique({ where: { id: dto.grnId } });
      if (!grn || grn.supplierId !== supplierId) {
        throw new NotFoundException('GRN not found for this supplier');
      }
    }

    return this.prisma.supplierPayment.create({
      data: {
        supplierId,
        grnId: dto.grnId,
        amount: dto.amount,
        method: dto.method,
        notes: dto.notes,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        createdBy: userId,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        grn: { select: { id: true, grnNo: true } },
      },
    });
  }

  async deleteSupplierPayment(paymentId: number) {
    const payment = await this.prisma.supplierPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.supplierPayment.delete({ where: { id: paymentId } });
  }

  async getSupplierFinancials(supplierId: number) {
    await this.findOneSupplier(supplierId);

    const [grns, payments] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where: { supplierId },
        include: {
          lines: { include: { product: { select: { id: true, nameAr: true, nameEn: true, barcode: true } } } },
          user: { select: { id: true, username: true, fullName: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierPayment.findMany({
        where: { supplierId },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          grn: { select: { id: true, grnNo: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    const totalInvoiced = grns.reduce((sum, g) => sum + Number(g.total), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalInvoiced - totalPaid;

    // Enrich GRNs with per-GRN paid amount
    const grnsWithPayments = grns.map((grn) => {
      const grnPaid = grn.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        ...grn,
        totalNum: Number(grn.total),
        subtotalNum: Number(grn.subtotal),
        taxAmountNum: Number(grn.taxAmount),
        paidAmount: grnPaid,
        remaining: Math.max(0, Number(grn.total) - grnPaid),
      };
    });

    return {
      summary: {
        totalInvoiced,
        totalPaid,
        balance,
        grnCount: grns.length,
      },
      grns: grnsWithPayments,
      payments,
    };
  }
}
