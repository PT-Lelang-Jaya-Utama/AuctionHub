import { IsDateString, IsNotEmpty } from 'class-validator';

export class StartAuctionDto {
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
