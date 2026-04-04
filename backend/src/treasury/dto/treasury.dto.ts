import { IsEnum, IsNumber, IsOptional, IsString, IsPositive, IsDateString, MinLength, MaxLength } from 'class-validator';

export enum TreasuryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum PaymentMethodEnum {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  MIXED = 'MIXED',
  INSTAPAY = 'INSTAPAY',
  FAWRY = 'FAWRY',
  WALLET = 'WALLET',
}

export class CreateTreasuryTransactionDto {
  @IsEnum(TreasuryType)
  type!: TreasuryType;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentMethodEnum)
  paymentMethod!: PaymentMethodEnum;

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
