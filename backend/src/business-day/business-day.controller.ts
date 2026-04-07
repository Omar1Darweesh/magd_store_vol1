import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { BusinessDayService } from './business-day.service';
import { OpenBusinessDayDto, CloseBusinessDayDto } from './dto/business-day.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('business-day')
@UseGuards(JwtAuthGuard)
export class BusinessDayController {
  constructor(private readonly businessDayService: BusinessDayService) { }

  @Post('open')
  open(@Body() dto: OpenBusinessDayDto, @Request() req: any) {
    return this.businessDayService.openBusinessDay(req.user.userId, dto.notes);
  }

  @Post('close')
  close(@Body() dto: CloseBusinessDayDto, @Request() req: any) {
    return this.businessDayService.closeBusinessDay(req.user.userId, dto.notes);
  }

  @Get('current')
  getCurrent() {
    return this.businessDayService.getCurrent();
  }

  @Get('history')
  getHistory(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.businessDayService.getHistory(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
    );
  }

  @Get(':id/z-report')
  getZReport(@Param('id', ParseIntPipe) id: number) {
    return this.businessDayService.getZReport(id);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.businessDayService.getById(id);
  }
}
