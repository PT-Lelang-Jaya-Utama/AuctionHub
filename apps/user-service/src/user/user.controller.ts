import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiResponse } from '@app/shared';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.createUser(createUserDto);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user.toObject();
    
    return ApiResponse.success(userWithoutPassword, 'User created successfully');
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user.toObject();
    
    return ApiResponse.success(userWithoutPassword);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.updateUser(id, updateUserDto);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user.toObject();
    
    return ApiResponse.success(userWithoutPassword, 'User updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
    return ApiResponse.success(null, 'User deleted successfully');
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    const profile = await this.userService.getProfile(id);
    return ApiResponse.success(profile);
  }

  @Put(':id/profile')
  async updateProfile(
    @Param('id') id: string,
    @Body() profileDto: UpdateUserDto['profile'],
  ) {
    const profile = await this.userService.updateProfile(id, profileDto || {});
    return ApiResponse.success(profile, 'Profile updated successfully');
  }

  @Get('seller/:sellerId/products')
  async getSellerProducts(@Param('sellerId') sellerId: string) {
    const products = await this.userService.getSellerProducts(sellerId);
    return ApiResponse.success(products);
  }

  @Get('buyer/:buyerId/bids')
  async getBuyerBids(@Param('buyerId') buyerId: string) {
    const bids = await this.userService.getBuyerBids(buyerId);
    return ApiResponse.success(bids);
  }
}
