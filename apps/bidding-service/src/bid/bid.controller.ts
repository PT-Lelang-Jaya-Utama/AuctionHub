import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { ApiResponse, JwtAuthGuard, CurrentUser, CurrentUserData } from '@app/shared';

@Controller('bids')
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async placeBid(
    @Body() createBidDto: CreateBidDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (user.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can place bids');
    }
    const bid = await this.bidService.placeBid({
      ...createBidDto,
      userId: user.userId,
    });
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
  @UseGuards(JwtAuthGuard)
  async getUserBids(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Users can only view their own bids
    if (userId !== user.userId) {
      throw new ForbiddenException('You can only view your own bids');
    }
    const bids = await this.bidService.getUserBids(userId);
    return ApiResponse.success(bids);
  }
}
