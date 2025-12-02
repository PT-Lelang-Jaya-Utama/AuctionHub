import { Module, Global, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import neo4j, { Driver } from 'neo4j-driver';

export const NEO4J_DRIVER = 'NEO4J_DRIVER';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NEO4J_DRIVER,
      useFactory: async (configService: ConfigService): Promise<Driver> => {
        const uri = configService.get<string>('NEO4J_URI', 'bolt://neo4j:7687');
        const user = configService.get<string>('NEO4J_USER', 'neo4j');
        const password = configService.get<string>('NEO4J_PASSWORD', 'password');

        const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 30000,
        });

        // Verify connectivity
        await driver.verifyConnectivity();

        return driver;
      },
      inject: [ConfigService],
    },
  ],
  exports: [NEO4J_DRIVER],
})
export class Neo4jModule implements OnModuleDestroy {
  constructor(private readonly driver: Driver) {}

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
    }
  }
}
