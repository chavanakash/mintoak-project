import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  merchantId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  method?: string;
}
