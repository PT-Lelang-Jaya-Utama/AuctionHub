import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductClientService } from './product-client.service';
import { UserClientService } from './user-client.service';

@Module({
  imports: [ConfigModule],
  providers: [ProductClientService, UserClientService],
  exports: [ProductClientService, UserClientService],
})
export class ClientsModule {}
