import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RecommendationServiceModule } from './recommendation-service.module';

async function bootstrap() {
  const app = await NestFactory.create(RecommendationServiceModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  await app.listen(3004);
  console.log('Recommendation Service is running on port 3004');
}
bootstrap();
