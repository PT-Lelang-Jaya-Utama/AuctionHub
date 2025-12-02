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
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';
import { StartAuctionDto } from './dto/start-auction.dto';
import { ApiResponse, PaginatedResponse } from '@app/shared';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() createProductDto: CreateProductDto) {
    const product = await this.productService.createProduct(createProductDto);
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
  async getProductById(@Param('id') id: string) {
    const product = await this.productService.findById(id);
    return ApiResponse.success(product.toObject());
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productService.updateProduct(id, updateProductDto);
    return ApiResponse.success(product.toObject(), 'Product updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Param('id') id: string) {
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

  @Get('category/:category')
  async getCategoryProducts(
    @Param('category') category: string,
    @Query() paginationDto: ProductFiltersDto,
  ) {
    const { page, limit } = paginationDto;
    const result = await this.productService.findByCategory(
      category,
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
  async startAuction(
    @Param('id') id: string,
    @Body() startAuctionDto: StartAuctionDto,
  ) {
    const product = await this.productService.startAuction(id, startAuctionDto);
    return ApiResponse.success(product.toObject(), 'Auction started successfully');
  }

  @Put(':id/end-auction')
  async endAuction(@Param('id') id: string) {
    const product = await this.productService.endAuction(id);
    return ApiResponse.success(product.toObject(), 'Auction ended successfully');
  }
}
