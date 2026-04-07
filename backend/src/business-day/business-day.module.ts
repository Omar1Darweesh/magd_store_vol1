import { Module } from '@nestjs/common';
import { BusinessDayService } from './business-day.service';
import { BusinessDayController } from './business-day.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [BusinessDayController],
  providers: [BusinessDayService, PrismaService],
  exports: [BusinessDayService],
})
export class BusinessDayModule { }
