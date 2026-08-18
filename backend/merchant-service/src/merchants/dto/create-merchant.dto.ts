import { IsString, IsOptional } from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  businessName: string;

  @IsString()
  ownerName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  country?: string;
}
