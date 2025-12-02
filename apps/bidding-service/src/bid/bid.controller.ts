import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { ApiResponse } from '@app/shared';

@Controller('bids')
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async placeBid(@Body() createBidDto: CreateBidDto) {
    const bid = await this.bidService.placeBid(createBidDto);
    return ApiResponse.success(bid, 'Bid placed successfully');
  }

  @Get('product/:productId')
  async getProductBids(@Param('productId') productId: string) {
    const bids = await this.bidService.getProductBids(productId);
    return ApiResponse.success(bids);
  }

  @Get('product/:productId/highest')
  async getHighestBid(@Param('productId') productId: string) {
    const bid = await this.bidService.getHighestBid(productId);
    return ApiResponse.success(bid);
  }

  @Get('user/:userId')
  async getUserBids(@Param('userId') userId: string) {
    const bids = await this.bidService.getUserBids(userId);
    return ApiResponse.success(bids);
  }

  @Get('product/:productId/winner')
  async getWinner(@Param('productId') productId: string) {
    const winner = await this.bidService.getWinner(productId);
    return ApiResponse.success(winner);
  }
}
