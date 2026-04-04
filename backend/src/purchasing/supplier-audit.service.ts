import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class SupplierAuditService {
  constructor(private prisma: PrismaService) {}

  async getSupplierAuditHistory(supplierId: number) {
    return (this.prisma as any).supplierAudit.findMany({
      where: { supplierId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFormattedAuditHistory(supplierId: number) {
    const [audits, grns, payments] = await Promise.all([
      this.getSupplierAuditHistory(supplierId),
      this.prisma.goodsReceipt.findMany({
        where: { supplierId },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          lines: {
            include: { product: { select: { nameAr: true, nameEn: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).supplierPayment.findMany({
        where: { supplierId },
        include: {
          user: { select: { id: true, username: true, fullName: true } },
          grn: { select: { id: true, grnNo: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    const auditEvents = audits.map((audit: any) => ({
      type: 'FIELD_CHANGE' as const,
      id: `audit-${audit.id}`,
      action: audit.action,
      changes: this.extractChanges(audit.oldData, audit.newData),
      user: audit.user,
      timestamp: audit.createdAt,
    }));

    const grnEvents = grns.map((grn: any) => ({
      type: 'GRN' as const,
      id: `grn-${grn.id}`,
      action: 'CREATE' as const,
      grnNumber: grn.grnNo,
      paymentTerm: grn.paymentTerm,
      totalAmount: Number(grn.total),
      taxAmount: Number(grn.taxAmount),
      netAmount: Number(grn.subtotal),
      items: grn.lines.map((l: any) => ({
        productName: l.product?.nameAr || l.product?.nameEn,
        quantity: l.qty,
        unitCost: Number(l.cost),
      })),
      user: grn.user,
      timestamp: grn.createdAt,
    }));

    const paymentEvents = payments.map((p: any) => ({
      type: 'PAYMENT' as const,
      id: `payment-${p.id}`,
      action: 'CREATE' as const,
      amount: Number(p.amount),
      method: p.method,
      notes: p.notes,
      grnNumber: p.grn?.grnNo || null,
      user: p.user,
      timestamp: p.paymentDate,
    }));

    return [...auditEvents, ...grnEvents, ...paymentEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  private extractChanges(
    oldData: any,
    newData: any,
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    if (!oldData || !newData) return [];

    const fieldsToTrack = [
      'name',
      'contact',
      'phone',
      'email',
      'address',
      'paymentTerms',
      'active',
    ];

    const changes = [];
    for (const field of fieldsToTrack) {
      const oldValue = oldData[field];
      const newValue = newData[field];
      if (!this.compareValues(oldValue, newValue)) {
        changes.push({ field, oldValue, newValue });
      }
    }
    return changes;
  }

  private compareValues(val1: any, val2: any): boolean {
    if (val1 == null && val2 == null) return true;
    if (val1 == null || val2 == null) return false;
    if (typeof val1 === 'boolean' || typeof val2 === 'boolean') {
      return Boolean(val1) === Boolean(val2);
    }
    return String(val1) === String(val2);
  }

  async logChange(
    supplierId: number,
    action: AuditAction,
    newData: any,
    oldData: any,
    userId: number,
  ) {
    const cleanNewData = this.cleanDataForAudit(newData);
    const cleanOldData = this.cleanDataForAudit(oldData);

    return (this.prisma as any).supplierAudit.create({
      data: {
        supplierId,
        action,
        newData: cleanNewData as Prisma.InputJsonValue,
        oldData: cleanOldData as Prisma.InputJsonValue,
        userId,
      },
    });
  }

  private cleanDataForAudit(data: any) {
    if (!data) return undefined;
    return {
      id: data.id,
      name: data.name,
      contact: data.contact,
      phone: data.phone,
      email: data.email,
      address: data.address,
      paymentTerms: data.paymentTerms,
      active: data.active,
    };
  }
}
