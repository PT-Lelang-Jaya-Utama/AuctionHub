import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { EXCHANGES, EXCHANGE_CONFIG, ExchangeType } from '../constants/exchanges.constants';
import { QUEUE_CONFIG } from '../constants/queues.constants';
import { IMessage } from '../interfaces/message.interface';

// Use Awaited to get the resolved type from amqp.connect
type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: AmqpConnection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const url = this.configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Setup exchanges
      await this.setupExchanges();
      
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', error);
    }
  }

  private async setupExchanges(): Promise<void> {
    if (!this.channel) return;

    for (const [exchange, config] of Object.entries(EXCHANGE_CONFIG)) {
      await this.channel.assertExchange(exchange, config.type, {
        durable: config.durable,
      });
    }
  }

  async publish<T>(
    exchange: ExchangeType,
    routingKey: string,
    payload: T,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const message: IMessage<T> = {
      id: uuidv4(),
      type: routingKey,
      timestamp: Date.now(),
      payload,
      metadata,
    };

    const buffer = Buffer.from(JSON.stringify(message));
    
    this.channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      contentType: 'application/json',
      messageId: message.id,
      timestamp: message.timestamp,
    });

    this.logger.debug(`Published message to ${exchange}/${routingKey}: ${message.id}`);
  }

  async subscribe(
    exchange: ExchangeType,
    queue: string,
    routingKey: string,
    handler: (message: IMessage) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    // Assert queue
    await this.channel.assertQueue(queue, {
      durable: QUEUE_CONFIG.durable,
    });

    // Bind queue to exchange
    await this.channel.bindQueue(queue, exchange, routingKey);

    // Consume messages
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const message: IMessage = JSON.parse(msg.content.toString());
        await handler(message);
        this.channel?.ack(msg);
      } catch (error) {
        this.logger.error(`Error processing message from ${queue}`, error);
        this.channel?.nack(msg, false, false);
      }
    });

    this.logger.log(`Subscribed to ${exchange}/${routingKey} -> ${queue}`);
  }

  async assertQueue(queue: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.assertQueue(queue, {
      durable: QUEUE_CONFIG.durable,
    });
  }

  getChannel(): amqp.Channel | null {
    return this.channel;
  }
}
