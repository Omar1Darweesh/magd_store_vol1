import {
  Controller, Get, Post, Delete, Body, Query, Param,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { CreateTreasuryTransactionDto, TreasuryQueryDto } from './dto/treasury.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('treasury')
@UseGuards(JwtAuthGuard)
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) { }

  @Get('summary')
  getSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.treasuryService.getSummary(dateFrom, dateTo);
  }

  @Get('transactions')
  getTransactions(@Query() query: TreasuryQueryDto) {
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
    return this.treasuryService.createManual(dto, req.user.id);
  }

  @Delete('transactions/:id')
  deleteManual(@Param('id', ParseIntPipe) id: number) {
    return this.treasuryService.deleteManual(id);
  }
}
