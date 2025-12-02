import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionModule } from '../session';
import { UserClientModule } from '../user-client';
import { JwtConfigModule } from '../jwt';

@Module({
  imports: [SessionModule, UserClientModule, JwtConfigModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
