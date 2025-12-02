import { IsNotEmpty, IsString, IsNumber, IsPositive } from 'class-validator';

export class CreateBidDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  // userId is extracted from JWT token, not from request body

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
