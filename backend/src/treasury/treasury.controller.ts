import {
  Controller, Get, Post, Delete, Body, Query, Param,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { CreateTreasuryTransactionDto, TreasuryQueryDto } from './dto/treasury.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@Controller('treasury')
@UseGuards(JwtAuthGuard)
export class TreasuryController {
  constructor(
    private readonly treasuryService: TreasuryService,
    private readonly prisma: PrismaService,
  ) { }

  @Get('summary')
  async getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Request() req?: any,
  ) {
    const requestingUserId: number = req?.user?.userId;
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    const isAdmin = userWithRoles?.roles.some(r => r.role.name.toUpperCase() === 'ADMIN') ?? false;
    const scopedUserId = isAdmin ? undefined : requestingUserId;
    return this.treasuryService.getSummary(dateFrom, dateTo, scopedUserId);
  }

  @Get('transactions')
  async getTransactions(@Query() query: TreasuryQueryDto, @Request() req: any) {
    const requestingUserId: number = req.user.userId;

    // Check if the requesting user has 'Admin' role
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    const isAdmin = userWithRoles?.roles.some(r => r.role.name.toUpperCase() === 'ADMIN') ?? false;

    // Non-admins are always scoped to their own transactions
    if (!isAdmin) {
      query.userId = String(requestingUserId);
    }

    return this.treasuryService.getTransactions(query);
  }

  @Get('daily')
  getDailyBreakdown(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.treasuryService.getDailyBreakdown(dateFrom, dateTo);
  }

  @Post('transactions')
  createManual(
    @Body() dto: CreateTreasuryTransactionDto,
    @Request() req: any,
  ) {
    return this.treasuryService.createManual(dto, req.user.userId);
  }

  @Delete('transactions/:id')
  deleteManual(@Param('id', ParseIntPipe) id: number) {
    return this.treasuryService.deleteManual(id);
  }
}
