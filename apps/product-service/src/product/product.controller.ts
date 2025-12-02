import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';
import { StartAuctionDto } from './dto/start-auction.dto';
import { ApiResponse, PaginatedResponse, JwtAuthGuard, CurrentUser, CurrentUserData, OptionalJwtAuthGuard } from '@app/shared';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    if (user.role !== 'seller') {
      throw new ForbiddenException('Only sellers can create products');
    }
    const product = await this.productService.createProduct({
      ...createProductDto,
      sellerId: user.userId,
    });
    return ApiResponse.success(product.toObject(), 'Product created successfully');
  }

  @Get()
  async getProducts(@Query() filtersDto: ProductFiltersDto) {
    const { page, limit, ...filters } = filtersDto;
    const result = await this.productService.findAll(
      filters,
      { page: page || 1, limit: limit || 10 },
    );
    return new PaginatedResponse(
      result.data.map(p => p.toObject()),
      result.page,
      result.limit,
      result.total,
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getProductById(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    const product = await this.productService.findById(id, user?.userId);
    return ApiResponse.success(product.toObject());
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const product = await this.productService.findById(id);
    if (product.sellerId !== user.userId) {
      throw new ForbiddenException('You can only update your own products');
    }
    const updated = await this.productService.updateProduct(id, updateProductDto);
    return ApiResponse.success(updated.toObject(), 'Product updated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const product = await this.productService.findById(id);
    if (product.sellerId !== user.userId) {
      throw new ForbiddenException('You can only delete your own products');
    }
    await this.productService.deleteProduct(id);
    return ApiResponse.success(null, 'Product deleted successfully');
  }

  @Get('seller/:sellerId')
  async getSellerProducts(
    @Param('sellerId') sellerId: string,
    @Query() paginationDto: ProductFiltersDto,
  ) {
    const { page, limit } = paginationDto;
    const result = await this.productService.findBySellerId(
      sellerId,
      { page: page || 1, limit: limit || 10 },
    );
    return new PaginatedResponse(
      result.data.map(p => p.toObject()),
      result.page,
      result.limit,
      result.total,
    );
  }

  @Get(':id/auction-status')
  async getAuctionStatus(@Param('id') id: string) {
    const auctionStatus = await this.productService.getAuctionStatus(id);
    return ApiResponse.success(auctionStatus);
  }

  @Put(':id/start-auction')
  @UseGuards(JwtAuthGuard)
  async startAuction(
    @Param('id') id: string,
    @Body() startAuctionDto: StartAuctionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const product = await this.productService.findById(id);
    if (product.sellerId !== user.userId) {
      throw new ForbiddenException('You can only start auctions for your own products');
    }
    const updated = await this.productService.startAuction(id, startAuctionDto);
    return ApiResponse.success(updated.toObject(), 'Auction started successfully');
  }

  @Put(':id/end-auction')
  @UseGuards(JwtAuthGuard)
  async endAuction(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const product = await this.productService.findById(id);
    if (product.sellerId !== user.userId) {
      throw new ForbiddenException('You can only end auctions for your own products');
    }
    const updated = await this.productService.endAuction(id);
    return ApiResponse.success(updated.toObject(), 'Auction ended successfully');
  }
}
