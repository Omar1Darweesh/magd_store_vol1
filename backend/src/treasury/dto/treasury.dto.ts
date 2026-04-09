import { IsEnum, IsNumber, IsOptional, IsString, IsPositive, IsDateString, MinLength, MaxLength } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export enum TreasuryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateTreasuryTransactionDto {
  @IsEnum(TreasuryType)
  type!: TreasuryType;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  purpose!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

export class TreasuryQueryDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(TreasuryType)
  type?: TreasuryType;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  pageSize?: string;
}
