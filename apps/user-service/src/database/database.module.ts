import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://mongodb-primary:27017,mongodb-secondary1:27018,mongodb-secondary2:27019/eauction?replicaSet=rs0',
        ),
        writeConcern: {
          w: 'majority',
        },
        readPreference: 'primaryPreferred',
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
