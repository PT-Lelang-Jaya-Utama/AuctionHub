import { SetMetadata } from '@nestjs/common';
import { ExchangeType } from '../constants/exchanges.constants';

export const RABBITMQ_CONSUMER_METADATA = 'RABBITMQ_CONSUMER_METADATA';

export interface RabbitMQConsumerOptions {
  exchange: ExchangeType;
  queue: string;
  routingKey: string;
}

export const Consume = (options: RabbitMQConsumerOptions) =>
  SetMetadata(RABBITMQ_CONSUMER_METADATA, options);
