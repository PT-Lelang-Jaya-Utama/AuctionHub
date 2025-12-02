import { IsNotEmpty, IsString, IsNumber, IsPositive } from 'class-validator';

export class CreateBidDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;
}
