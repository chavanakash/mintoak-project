import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

const PAYMENT_METHODS = ['UPI', 'CARD', 'QR', 'SMS_LINK'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class CreateTransactionDto {
  @IsString()
  merchantId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: PaymentMethod;
}
