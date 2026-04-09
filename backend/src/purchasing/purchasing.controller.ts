import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { SupplierAuditService } from './supplier-audit.service';
import { CreateGRNDto, CreateSupplierDto, CreateSupplierPaymentDto } from './dto/purchasing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('purchasing')
@UseGuards(JwtAuthGuard)
export class PurchasingController {
  constructor(
    private readonly purchasingService: PurchasingService,
    private readonly supplierAuditService: SupplierAuditService,
  ) { }

  // Suppliers
  @Get('suppliers/stats')
  getSuppliersStats() {
    return this.purchasingService.getSuppliersStats();
  }

  @Get('suppliers/with-balance')
  findAllSuppliersWithBalance(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
    @Query('paymentTerms') paymentTerms?: string,
    @Query('balanceStatus') balanceStatus?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.purchasingService.findAllSuppliersWithBalance({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      active: active !== undefined ? active === 'true' : undefined,
      search,
      paymentTerms,
      balanceStatus,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
  }

  @Post('suppliers')
  createSupplier(@Body() createSupplierDto: CreateSupplierDto, @Request() req: any) {
    return this.purchasingService.createSupplier(createSupplierDto, req.user.userId);
  }

  @Get('suppliers')
  findAllSuppliers(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
  ) {
    return this.purchasingService.findAllSuppliers({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      active: active !== undefined ? active === 'true' : undefined,
      search,
    });
  }

  @Get('suppliers/:id')
  findOneSupplier(@Param('id', ParseIntPipe) id: number) {
    return this.purchasingService.findOneSupplier(id);
  }

  @Get('suppliers/:id/audit-history')
  getSupplierAuditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.supplierAuditService.getFormattedAuditHistory(id);
  }

  @Patch('suppliers/:id')
  updateSupplier(@Param('id', ParseIntPipe) id: number, @Body() data: any, @Request() req: any) {
    return this.purchasingService.updateSupplier(id, data, req.user.userId);
  }

  @Delete('suppliers/:id')
  removeSupplier(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.purchasingService.removeSupplier(id, req.user.userId);
  }

  @Patch('suppliers/:id/toggle-active')
  toggleSupplierActive(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.purchasingService.toggleSupplierActive(id, req.user.userId);
  }

  @Get('suppliers/:id/financials')
  getSupplierFinancials(@Param('id', ParseIntPipe) id: number) {
    return this.purchasingService.getSupplierFinancials(id);
  }

  @Post('suppliers/:id/payments')
  addSupplierPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSupplierPaymentDto,
    @Request() req: any,
  ) {
    return this.purchasingService.addSupplierPayment(id, dto, req.user.userId);
  }

  @Delete('payments/:paymentId')
  deleteSupplierPayment(@Param('paymentId', ParseIntPipe) paymentId: number) {
    return this.purchasingService.deleteSupplierPayment(paymentId);
  }

  // GRN
  @Post('grn')
  createGRN(@Body() createGRNDto: CreateGRNDto, @Request() req: any) {
    return this.purchasingService.createGRN(createGRNDto, req.user.userId);
  }

  @Get('grn')
  findAllGRNs(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.purchasingService.findAllGRNs({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      branchId: branchId ? parseInt(branchId) : undefined,
    });
  }

  @Get('grn/:id')
  findOneGRN(@Param('id', ParseIntPipe) id: number) {
    return this.purchasingService.findOneGRN(id);
  }
}
