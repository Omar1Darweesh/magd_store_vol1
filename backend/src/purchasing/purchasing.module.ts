import { Module } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { PurchasingController } from './purchasing.controller';
import { PrismaService } from '../prisma.service';
import { StockModule } from '../stock/stock.module';
import { CostAccountingService } from '../stock/cost-accounting.service';
import { ProfitMarginService } from '../products/profit-margin.service';
import { ProductAuditService } from '../products/product-audit.service';
import { SupplierAuditService } from './supplier-audit.service';

@Module({
  imports: [StockModule],
  controllers: [PurchasingController],
  providers: [
    PurchasingService,
    PrismaService,
    CostAccountingService,
    ProfitMarginService,
    ProductAuditService,
    SupplierAuditService,
  ],
})
export class PurchasingModule { }
