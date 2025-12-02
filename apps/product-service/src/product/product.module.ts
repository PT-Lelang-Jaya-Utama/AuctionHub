import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitMQModule } from '@app/rabbitmq';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductRepository } from './repositories/product.repository';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductMessageConsumer } from './consumers/product-message.consumer';
import { ClientsModule } from '../clients';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    RabbitMQModule,
    ClientsModule,
  ],
  controllers: [ProductController],
  providers: [ProductRepository, ProductService, ProductMessageConsumer],
  exports: [ProductService, ProductRepository],
})
export class ProductModule {}
