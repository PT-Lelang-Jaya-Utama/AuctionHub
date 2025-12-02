import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';
import { NEO4J_DRIVER } from '../../neo4j';
import {
  UserNode,
  ProductNode,
  RecommendedProduct,
  SimilarProduct,
} from '../interfaces';

@Injectable()
export class RecommendationRepository implements OnModuleInit {
  private readonly logger = new Logger(RecommendationRepository.name);

  constructor(@Inject(NEO4J_DRIVER) private readonly driver: Driver) {}

  async onModuleInit() {
    await this.createConstraintsAndIndexes();
  }

  private getSession(): Session {
    return this.driver.session();
  }

  private async createConstraintsAndIndexes(): Promise<void> {
    const session = this.getSession();
    try {
      // Create constraints for unique identifiers
      await session.run(`
        CREATE CONSTRAINT user_id IF NOT EXISTS
        FOR (u:User) REQUIRE u.userId IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT product_id IF NOT EXISTS
        FOR (p:Product) REQUIRE p.productId IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT category_name IF NOT EXISTS
        FOR (c:Category) REQUIRE c.name IS UNIQUE
      `);

      // Create indexes for faster lookups
      await session.run(`
        CREATE INDEX user_role IF NOT EXISTS
        FOR (u:User) ON (u.role)
      `);

      await session.run(`
        CREATE INDEX product_category IF NOT EXISTS
        FOR (p:Product) ON (p.category)
      `);

      this.logger.log('Neo4j constraints and indexes created');
    } catch (error) {
      this.logger.warn('Error creating constraints (may already exist)', error);
    } finally {
      await session.close();
    }
  }

  // User Node Operations
  async createUserNode(user: UserNode): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MERGE (u:User {userId: $userId})
        SET u.role = $role
        `,
        { userId: user.userId, role: user.role },
      );
      this.logger.debug(`Created/Updated User node: ${user.userId}`);
    } finally {
      await session.close();
    }
  }

  // Product Node Operations
  async createProductNode(product: ProductNode): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MERGE (p:Product {productId: $productId})
        SET p.category = $category, p.title = $title
        MERGE (c:Category {name: $category})
        MERGE (p)-[:BELONGS_TO]->(c)
        `,
        {
          productId: product.productId,
          category: product.category,
          title: product.title,
        },
      );
      this.logger.debug(`Created/Updated Product node: ${product.productId}`);
    } finally {
      await session.close();
    }
  }

  // Relationship Operations
  async createViewedRelationship(
    userId: string,
    productId: string,
    timestamp: number,
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (u:User {userId: $userId})
        MATCH (p:Product {productId: $productId})
        MERGE (u)-[r:VIEWED]->(p)
        SET r.timestamp = $timestamp
        `,
        { userId, productId, timestamp },
      );
    } finally {
      await session.close();
    }
  }

  async createBidRelationship(
    userId: string,
    productId: string,
    amount: number,
    timestamp: number,
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (u:User {userId: $userId})
        MATCH (p:Product {productId: $productId})
        MERGE (u)-[r:BID]->(p)
        SET r.amount = $amount, r.timestamp = $timestamp
        `,
        { userId, productId, amount, timestamp },
      );
    } finally {
      await session.close();
    }
  }

  async createWonRelationship(
    userId: string,
    productId: string,
    timestamp: number,
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (u:User {userId: $userId})
        MATCH (p:Product {productId: $productId})
        MERGE (u)-[r:WON]->(p)
        SET r.timestamp = $timestamp
        `,
        { userId, productId, timestamp },
      );
    } finally {
      await session.close();
    }
  }

  async createSimilarToRelationship(
    productId1: string,
    productId2: string,
    score: number,
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (p1:Product {productId: $productId1})
        MATCH (p2:Product {productId: $productId2})
        MERGE (p1)-[r:SIMILAR_TO]->(p2)
        SET r.score = $score
        `,
        { productId1, productId2, score },
      );
    } finally {
      await session.close();
    }
  }

  // Recommendation Queries
  async getUserRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<RecommendedProduct[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        // Find products in categories user has bid on
        MATCH (u:User {userId: $userId})-[:BID]->(bidProduct:Product)-[:BELONGS_TO]->(c:Category)
        MATCH (recommended:Product)-[:BELONGS_TO]->(c)
        WHERE recommended.productId <> bidProduct.productId
          AND NOT (u)-[:BID]->(recommended)
          AND NOT (u)-[:WON]->(recommended)
        WITH recommended, COUNT(DISTINCT c) as categoryScore
        
        // Also find products similar to ones user has viewed
        OPTIONAL MATCH (u)-[:VIEWED]->(viewed:Product)-[:SIMILAR_TO]-(similar:Product)
        WHERE similar.productId = recommended.productId
        
        WITH recommended, categoryScore, COUNT(similar) as similarityScore
        
        RETURN recommended.productId as productId,
               recommended.category as category,
               recommended.title as title,
               (categoryScore * 2 + similarityScore) as score
        ORDER BY score DESC
        LIMIT $limit
        `,
        { userId, limit: limit },
      );

      return result.records.map((record) => ({
        productId: record.get('productId'),
        category: record.get('category'),
        title: record.get('title'),
        score: record.get('score').toNumber(),
      }));
    } finally {
      await session.close();
    }
  }

  async getSimilarProducts(
    productId: string,
    limit: number = 10,
  ): Promise<SimilarProduct[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (p:Product {productId: $productId})-[:BELONGS_TO]->(c:Category)
        
        // Find products in same category
        MATCH (similar:Product)-[:BELONGS_TO]->(c)
        WHERE similar.productId <> $productId
        WITH similar, 1 as categoryMatch
        
        // Find products that same users have bid on
        OPTIONAL MATCH (u:User)-[:BID]->(p:Product {productId: $productId})
        OPTIONAL MATCH (u)-[:BID]->(similar)
        WITH similar, categoryMatch, COUNT(DISTINCT u) as sharedBidders
        
        // Check for explicit SIMILAR_TO relationships
        OPTIONAL MATCH (p:Product {productId: $productId})-[r:SIMILAR_TO]-(similar)
        WITH similar, categoryMatch, sharedBidders, COALESCE(r.score, 0) as explicitScore
        
        RETURN similar.productId as productId,
               similar.category as category,
               similar.title as title,
               (categoryMatch * 3 + sharedBidders * 2 + explicitScore) as similarityScore
        ORDER BY similarityScore DESC
        LIMIT $limit
        `,
        { productId, limit: limit },
      );

      return result.records.map((record) => ({
        productId: record.get('productId'),
        category: record.get('category'),
        title: record.get('title'),
        similarityScore: record.get('similarityScore').toNumber(),
      }));
    } finally {
      await session.close();
    }
  }

  // Training/Rebuild Operations
  async rebuildSimilarityRelationships(): Promise<number> {
    const session = this.getSession();
    try {
      // Remove existing SIMILAR_TO relationships
      await session.run(`
        MATCH ()-[r:SIMILAR_TO]->()
        DELETE r
      `);

      // Create new SIMILAR_TO relationships based on shared bidders
      const result = await session.run(`
        MATCH (p1:Product)<-[:BID]-(u:User)-[:BID]->(p2:Product)
        WHERE p1.productId < p2.productId
        WITH p1, p2, COUNT(DISTINCT u) as sharedBidders
        WHERE sharedBidders >= 2
        MERGE (p1)-[r:SIMILAR_TO]->(p2)
        SET r.score = sharedBidders
        RETURN COUNT(r) as relationshipsCreated
      `);

      const count = result.records[0]?.get('relationshipsCreated')?.toNumber() || 0;
      this.logger.log(`Rebuilt ${count} SIMILAR_TO relationships`);
      return count;
    } finally {
      await session.close();
    }
  }

  // Utility methods
  async deleteUserNode(userId: string): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (u:User {userId: $userId})
        DETACH DELETE u
        `,
        { userId },
      );
    } finally {
      await session.close();
    }
  }

  async deleteProductNode(productId: string): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (p:Product {productId: $productId})
        DETACH DELETE p
        `,
        { productId },
      );
    } finally {
      await session.close();
    }
  }
}
