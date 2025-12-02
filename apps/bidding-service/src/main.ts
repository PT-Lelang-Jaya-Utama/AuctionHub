import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { BiddingServiceModule } from './bidding-service.module';

async function bootstrap() {
  const app = await NestFactory.create(BiddingServiceModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  await app.listen(3003);
  console.log('Bidding Service is running on port 3003');
}
bootstrap();
