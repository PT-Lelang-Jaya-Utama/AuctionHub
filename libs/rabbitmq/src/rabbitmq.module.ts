import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQService } from './services/rabbitmq.service';

export interface RabbitMQModuleOptions {
  url?: string;
}

@Global()
@Module({})
export class RabbitMQModule {
  static forRoot(options?: RabbitMQModuleOptions): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'RABBITMQ_OPTIONS',
          useValue: options || {},
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [ConfigModule],
      providers: [RabbitMQService],
      exports: [RabbitMQService],
    };
  }
}
