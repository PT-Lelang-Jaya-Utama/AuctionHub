import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Driver, Session, Integer } from 'neo4j-driver';
import { NEO4J_DRIVER } from '../../neo4j';
import {
  UserNode,
  ProductNode,
  RecommendedProduct,
  SimilarProduct,
} from '../interfaces';

// Helper to convert Neo4j values to JS numbers
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (Integer.isInteger(value)) return (value as Integer).toNumber();
  return Number(value);
};

// Scoring weights for similarity calculation
const SCORING_WEIGHTS = {
  CATEGORY_MATCH: 3,      // Same category
  SHARED_BIDDERS: 2,      // Users who bid on both products
  EXPLICIT_SIMILARITY: 1, // Pre-computed SIMILAR_TO score
  VIEW_OVERLAP: 1,        // Users who viewed both products
} as const;

// Scoring weights for user recommendations
const RECOMMENDATION_WEIGHTS = {
  CATEGORY_INTEREST: 2,   // Products in categories user has bid on
  SIMILAR_TO_VIEWED: 1.5, // Products similar to ones user viewed
  VIEW_RECENCY: 0.5,      // Boost for recently viewed similar products
} as const;

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
        ON CREATE SET r.viewCount = 1, r.firstViewedAt = $timestamp, r.lastViewedAt = $timestamp
        ON MATCH SET r.viewCount = r.viewCount + 1, r.lastViewedAt = $timestamp
        `,
        { userId, productId, timestamp },
      );
      this.logger.debug(`Created/Updated VIEWED relationship: ${userId} -> ${productId}`);
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
        // Find products in categories user has interacted with (bid or viewed)
        MATCH (u:User {userId: $userId})
        
        // Get categories from bids (stronger signal)
        OPTIONAL MATCH (u)-[:BID]->(bidProduct:Product)-[:BELONGS_TO]->(bidCategory:Category)
        WITH u, COLLECT(DISTINCT bidCategory.name) as bidCategoryNames
        
        // Get categories from views (weaker signal)
        OPTIONAL MATCH (u)-[:VIEWED]->(viewedProduct:Product)-[:BELONGS_TO]->(viewCategory:Category)
        WITH u, bidCategoryNames, COLLECT(DISTINCT viewCategory.name) as viewCategoryNames
        
        // Find candidate products in those categories
        MATCH (recommended:Product)-[:BELONGS_TO]->(c:Category)
        WHERE (c.name IN bidCategoryNames OR c.name IN viewCategoryNames)
          AND NOT (u)-[:BID]->(recommended)
          AND NOT (u)-[:WON]->(recommended)
        
        // Calculate category score (bid categories worth more)
        WITH u, recommended, c,
             CASE WHEN c.name IN bidCategoryNames THEN 2 ELSE 0 END +
             CASE WHEN c.name IN viewCategoryNames THEN 1 ELSE 0 END as categoryScore
        
        // Find products similar to ones user has viewed (with recency boost)
        OPTIONAL MATCH (u)-[v:VIEWED]->(viewed:Product)-[sim:SIMILAR_TO]-(recommended)
        WITH recommended, categoryScore,
             SUM(COALESCE(sim.score, 0) * (1 + CASE WHEN v.lastViewedAt > (timestamp() - 604800000) THEN 0.5 ELSE 0 END)) as similarityScore
        
        // Final score calculation
        WITH recommended,
             (categoryScore * $categoryWeight + similarityScore * $similarWeight) as score
        WHERE score > 0
        
        RETURN recommended.productId as productId,
               recommended.category as category,
               recommended.title as title,
               score
        ORDER BY score DESC
        LIMIT toInteger($limit)
        `,
        { 
          userId, 
          limit: Math.floor(limit),
          categoryWeight: RECOMMENDATION_WEIGHTS.CATEGORY_INTEREST,
          similarWeight: RECOMMENDATION_WEIGHTS.SIMILAR_TO_VIEWED,
        },
      );

      return result.records.map((record) => ({
        productId: record.get('productId'),
        category: record.get('category'),
        title: record.get('title'),
        score: toNumber(record.get('score')),
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
        WITH p, similar, 1 as categoryMatch
        
        // Find products that same users have bid on
        OPTIONAL MATCH (u:User)-[:BID]->(p)
        OPTIONAL MATCH (u)-[:BID]->(similar)
        WITH p, similar, categoryMatch, COUNT(DISTINCT u) as sharedBidders
        
        // Find products that same users have viewed (view overlap)
        OPTIONAL MATCH (v:User)-[:VIEWED]->(p)
        OPTIONAL MATCH (v)-[:VIEWED]->(similar)
        WITH p, similar, categoryMatch, sharedBidders, COUNT(DISTINCT v) as sharedViewers
        
        // Check for explicit SIMILAR_TO relationships
        OPTIONAL MATCH (p)-[r:SIMILAR_TO]-(similar)
        WITH similar, categoryMatch, sharedBidders, sharedViewers, COALESCE(r.score, 0) as explicitScore
        
        RETURN similar.productId as productId,
               similar.category as category,
               similar.title as title,
               (categoryMatch * $categoryWeight + 
                sharedBidders * $bidderWeight + 
                sharedViewers * $viewWeight +
                explicitScore * $explicitWeight) as similarityScore
        ORDER BY similarityScore DESC
        LIMIT toInteger($limit)
        `,
        { 
          productId, 
          limit: Math.floor(limit),
          categoryWeight: SCORING_WEIGHTS.CATEGORY_MATCH,
          bidderWeight: SCORING_WEIGHTS.SHARED_BIDDERS,
          viewWeight: SCORING_WEIGHTS.VIEW_OVERLAP,
          explicitWeight: SCORING_WEIGHTS.EXPLICIT_SIMILARITY,
        },
      );

      return result.records.map((record) => ({
        productId: record.get('productId'),
        category: record.get('category'),
        title: record.get('title'),
        similarityScore: toNumber(record.get('similarityScore')),
      }));
    } finally {
      await session.close();
    }
  }

  // Training/Rebuild Operations
  
  /**
   * Update similarity relationships for a specific product (incremental update)
   * Called when an auction ends to update relationships for that product
   */
  async updateSimilarityForProduct(productId: string): Promise<number> {
    const session = this.getSession();
    try {
      // Remove existing SIMILAR_TO relationships for this product
      await session.run(
        `
        MATCH (p:Product {productId: $productId})-[r:SIMILAR_TO]-()
        DELETE r
        `,
        { productId },
      );

      // Create new SIMILAR_TO relationships based on shared bidders and viewers
      const result = await session.run(
        `
        MATCH (p:Product {productId: $productId})
        
        // Find products with shared bidders
        OPTIONAL MATCH (p)<-[:BID]-(bidder:User)-[:BID]->(other:Product)
        WHERE other.productId <> $productId
        WITH p, other, COUNT(DISTINCT bidder) as sharedBidders
        
        // Find products with shared viewers
        OPTIONAL MATCH (p)<-[:VIEWED]-(viewer:User)-[:VIEWED]->(other)
        WITH p, other, sharedBidders, COUNT(DISTINCT viewer) as sharedViewers
        
        // Calculate combined score
        WITH p, other, (sharedBidders * 2 + sharedViewers) as combinedScore
        WHERE combinedScore >= 2
        
        MERGE (p)-[r:SIMILAR_TO]->(other)
        SET r.score = combinedScore,
            r.sharedBidders = sharedBidders,
            r.sharedViewers = sharedViewers,
            r.updatedAt = timestamp()
        RETURN COUNT(r) as relationshipsCreated
        `,
        { productId },
      );

      const count = toNumber(result.records[0]?.get('relationshipsCreated'));
      this.logger.log(`Updated ${count} SIMILAR_TO relationships for product: ${productId}`);
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
