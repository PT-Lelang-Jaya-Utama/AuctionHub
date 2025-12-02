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
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiResponse, JwtAuthGuard, CurrentUser, CurrentUserData } from '@app/shared';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Internal endpoint - called by auth-service only
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.createUser(createUserDto);
    const { password, ...userWithoutPassword } = user.toObject();
    return ApiResponse.success(userWithoutPassword, 'User created successfully');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Users can only view their own profile
    if (id !== user.userId) {
      throw new ForbiddenException('You can only view your own profile');
    }
    const foundUser = await this.userService.findById(id);
    const { password, ...userWithoutPassword } = foundUser.toObject();
    return ApiResponse.success(userWithoutPassword);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Users can only update their own profile
    if (id !== user.userId) {
      throw new ForbiddenException('You can only update your own profile');
    }
    const updatedUser = await this.userService.updateUser(id, updateUserDto);
    const { password, ...userWithoutPassword } = updatedUser.toObject();
    return ApiResponse.success(userWithoutPassword, 'User updated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Users can only delete their own account
    if (id !== user.userId) {
      throw new ForbiddenException('You can only delete your own account');
    }
    await this.userService.deleteUser(id);
    return ApiResponse.success(null, 'User deleted successfully');
  }

  // Internal endpoint - called by auth-service only
  @Post('validate-credentials')
  @HttpCode(HttpStatus.OK)
  async validateCredentials(
    @Body() body: { email: string; password: string },
  ) {
    const user = await this.userService.validateCredentials(body.email, body.password);
    if (!user) {
      return ApiResponse.error('Invalid credentials');
    }
    const { password, ...userWithoutPassword } = user.toObject();
    return ApiResponse.success(userWithoutPassword);
  }
}
