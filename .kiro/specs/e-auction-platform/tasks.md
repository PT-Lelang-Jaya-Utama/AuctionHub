# Implementation Plan: E-Auction Platform

## Phase 1: Infrastructure Setup

- [x] 1. Set up Docker infrastructure












  - [x] 1.1 Create base Docker Compose file with networks and volumes




    - Define eauction-network bridge network
    - Define all required volumes (redis, mongodb, neo4j, kong, rabbitmq)
    - _Requirements: Section 7 - Docker Compose Structure_
  - [x] 1.2 Configure Redis Master-Slave with Sentinel

    - Set up redis-master on port 6379
    - Set up redis-slave on port 6380
    - Set up redis-sentinel on port 26379
    - Create sentinel.conf configuration
    - _Requirements: Section 1 - Auth Service Database, Section 4 - Bidding Service Database_

  - [x] 1.3 Configure MongoDB Replica Set
    - Set up mongodb-primary on port 27017
    - Set up mongodb-secondary1 on port 27018
    - Set up mongodb-secondary2 on port 27019
    - Create replica set initialization script

    - _Requirements: Section 2 - User Service Database, Section 3 - Product Service Database_
  - [x] 1.4 Configure Neo4j single instance

    - Set up neo4j with bolt port 7687 and http port 7474
    - _Requirements: Section 5 - Recommendation Service Database_
  - [x] 1.5 Configure RabbitMQ message broker

    - Set up rabbitmq on port 5672
    - Configure management UI on port 15672
    - _Requirements: Section 10 - Inter-Service Communication_
  - [x] 1.6 Configure Kong API Gateway
    - Set up kong-database (PostgreSQL)
    - Set up kong gateway on port 8000
    - Configure routes for all services
    - Configure plugins (rate-limiting, jwt, cors)
    - _Requirements: Section 6 - Kong API Gateway Configuration_

- [x] 2. Checkpoint - Verify infrastructure




  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Shared Libraries and Base Setup

- [x] 3. Create NestJS monorepo structure





  - [x] 3.1 Initialize NestJS monorepo with shared libraries


    - Create apps folder for microservices
    - Create libs folder for shared code
    - Configure TypeScript paths
    - _Requirements: Architecture Overview - Microservices_

  - [x] 3.2 Create shared DTOs and interfaces library

    - Define common response formats
    - Define shared validation decorators
    - Define common error classes
    - _Requirements: All Services - Data Models_

  - [x] 3.3 Create RabbitMQ shared module

    - Implement message publisher utility
    - Implement message consumer decorators
    - Define exchange and queue constants
    - _Requirements: Section 10 - Exchanges & Queues_
  - [x] 3.4 Create health check module


    - Implement health check endpoints for all services
    - _Requirements: Deployment Notes - Health checks_

## Phase 3: Auth Service Implementation

- [x] 4. Implement Auth Service





  - [x] 4.1 Set up Auth Service NestJS application


    - Create auth-service app in monorepo
    - Configure Redis Sentinel connection
    - Set up JWT module
    - _Requirements: Section 1 - Auth Service_
  - [x] 4.2 Implement session management with Redis


    - Create session repository for Redis operations
    - Implement session creation with TTL (24h)
    - Implement session retrieval and deletion
    - Implement refresh token storage (7d TTL)
    - _Requirements: Section 1 - Data Model (Redis)_
  - [ ]* 4.3 Write property test for session round trip
    - **Property 1: Session Round Trip**
    - **Validates: Requirements Auth Service - Login/Verify**
  - [x] 4.4 Implement POST /auth/register endpoint


    - Validate email format
    - Hash password with bcrypt
    - Call User Service to create user
    - _Requirements: Section 1 - Endpoints, Business Logic_

  - [x] 4.5 Implement POST /auth/login endpoint

    - Validate credentials via User Service
    - Create session in Redis
    - Generate and return JWT token
    - _Requirements: Section 1 - Endpoints, Business Logic_

  - [x] 4.6 Implement POST /auth/logout endpoint

    - Delete session from Redis
    - _Requirements: Section 1 - Endpoints, Business Logic_

  - [x] 4.7 Implement POST /auth/refresh-token endpoint

    - Validate refresh token
    - Create new session
    - Return new JWT token
    - _Requirements: Section 1 - Endpoints, Business Logic_
  - [x] 4.8 Implement GET /auth/verify endpoint


    - Check session exists in Redis
    - Return session data
    - _Requirements: Section 1 - Endpoints, Business Logic_
  - [x] 4.9 Create Auth Service Dockerfile


    - Use node:18-alpine base image
    - Configure health check
    - _Requirements: Deployment Notes_
  - [ ]* 4.10 Write unit tests for Auth Service
    - Test session management
    - Test JWT token generation
    - Test endpoint handlers
    - _Requirements: Section 1_

- [x] 5. Checkpoint - Auth Service





  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: User Service Implementation

- [x] 6. Implement User Service





  - [x] 6.1 Set up User Service NestJS application


    - Create user-service app in monorepo
    - Configure MongoDB replica set connection
    - Set up Mongoose module
    - _Requirements: Section 2 - User Service_

  - [x] 6.2 Implement User MongoDB schema and repository

    - Create User schema with all fields
    - Implement soft delete functionality
    - Configure write concern: majority
    - Configure read preference: primaryPreferred
    - _Requirements: Section 2 - Data Model (MongoDB)_
  - [ ]* 6.3 Write property test for soft delete preservation
    - **Property 5: Soft Delete Preservation**
    - **Validates: Requirements User Service - Delete**

  - [x] 6.4 Implement POST /users endpoint

    - Validate email uniqueness
    - Hash password
    - Store user in MongoDB
    - Publish user.created event
    - _Requirements: Section 2 - Endpoints, Business Logic_

  - [x] 6.5 Implement GET /users/:id endpoint

    - Retrieve user by ID (exclude soft deleted)
    - _Requirements: Section 2 - Endpoints_

  - [x] 6.6 Implement PUT /users/:id endpoint

    - Update user profile
    - Handle role-specific fields (seller/buyer)
    - Publish user.updated event
    - _Requirements: Section 2 - Endpoints, Business Logic_

  - [x] 6.7 Implement DELETE /users/:id endpoint

    - Soft delete (set deletedAt)
    - Publish user.deleted event
    - _Requirements: Section 2 - Endpoints, Business Logic_


  - [x] 6.8 Implement profile endpoints

    - GET /users/:id/profile
    - PUT /users/:id/profile

    - _Requirements: Section 2 - Endpoints_
  - [x] 6.9 Implement aggregation endpoints

    - GET /users/seller/:sellerId/products (aggregate with Product Service)
    - GET /users/buyer/:buyerId/bids (aggregate with Bidding Service)
    - _Requirements: Section 2 - Endpoints, Business Logic_
  - [x] 6.10 Implement RabbitMQ event publishers


    - Publish user.created, user.updated, user.deleted events
    - _Requirements: Section 2 - Message Queue Listeners_

  - [x] 6.11 Create User Service Dockerfile

    - Use node:18-alpine base image
    - Configure health check
    - _Requirements: Deployment Notes_
  - [ ]* 6.12 Write unit tests for User Service
    - Test user CRUD operations
    - Test soft delete functionality
    - Test event publishing
    - _Requirements: Section 2_

- [x] 7. Checkpoint - User Service





  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Product Service Implementation

- [x] 8. Implement Product Service



  - [x] 8.1 Set up Product Service NestJS application


    - Create product-service app in monorepo
    - Configure MongoDB replica set connection
    - Set up Mongoose module
    - _Requirements: Section 3 - Product Service_

  - [x] 8.2 Implement Product MongoDB schema and repository

    - Create Product schema with all fields
    - Implement soft delete functionality
    - Implement auction status management
    - _Requirements: Section 3 - Data Model (MongoDB)_
  - [ ]* 8.3 Write property test for auction state machine
    - **Property 4: Auction State Machine**
    - **Validates: Requirements Product Service - Auction Lifecycle**
  - [x] 8.4 Implement POST /products endpoint


    - Validate sellerId via User Service
    - Set initial status as draft
    - Publish product.created event
    - _Requirements: Section 3 - Endpoints, Business Logic_
  - [ ]* 8.5 Write property test for user-product ownership
    - **Property 8: User-Product Ownership**
    - **Validates: Requirements Product Service - Create Product**
  - [x] 8.6 Implement GET /products/:id endpoint

    - Retrieve product by ID (exclude soft deleted)
    - _Requirements: Section 3 - Endpoints_

  - [x] 8.7 Implement PUT /products/:id endpoint
    - Only allow updates if status is draft
    - Publish product.updated event

    - _Requirements: Section 3 - Endpoints, Business Logic_
  - [x] 8.8 Implement DELETE /products/:id endpoint
    - Soft delete (set deletedAt)

    - Publish product.deleted event
    - _Requirements: Section 3 - Endpoints, Business Logic_
  - [x] 8.9 Implement listing endpoints
    - GET /products (with pagination and filters)

    - GET /products/seller/:sellerId
    - GET /products/category/:category
    - _Requirements: Section 3 - Endpoints_
  - [x] 8.10 Implement auction lifecycle endpoints

    - GET /products/:id/auction-status
    - PUT /products/:id/start-auction (validate time, set active, publish auction.started)
    - PUT /products/:id/end-auction (set ended, get winner from Bidding Service, publish auction.ended)
    - _Requirements: Section 3 - Endpoints, Business Logic_
  - [x] 8.11 Implement RabbitMQ consumers and publishers

    - Listen to bid.placed (update currentPrice and totalBids)
    - Listen to auction.ended (update status and winnerId)
    - Publish product events
    - _Requirements: Section 3 - Message Queue Listeners/Publishers_

  - [x] 8.12 Create Product Service Dockerfile


    - Use node:18-alpine base image
    - Configure health check
    - _Requirements: Deployment Notes_
  - [ ]* 8.13 Write unit tests for Product Service
    - Test product CRUD operations
    - Test auction lifecycle
    - Test event handling
    - _Requirements: Section 3_

- [x] 9. Checkpoint - Product Service





  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Bidding Service Implementation

- [x] 10. Implement Bidding Service



  - [x] 10.1 Set up Bidding Service NestJS application


    - Create bidding-service app in monorepo
    - Configure Redis Sentinel connection
    - _Requirements: Section 4 - Bidding Service_

  - [x] 10.2 Implement bid storage with Redis sorted sets

    - Implement sorted set operations for bids:{productId}
    - Implement bid detail storage bid:{bidId}
    - Implement user bids list user:bids:{userId}
    - Configure TTL (30 days after auction ends)
    - _Requirements: Section 4 - Data Model (Redis)_
  - [ ]* 10.3 Write property test for bid ordering consistency
    - **Property 2: Bid Ordering Consistency**
    - **Validates: Requirements Bidding Service - Get Product Bids**
  - [ ]* 10.4 Write property test for highest bid invariant
    - **Property 3: Highest Bid Invariant**
    - **Validates: Requirements Bidding Service - Get Highest Bid**

  - [x] 10.5 Implement POST /bids endpoint

    - Validate auction is active (via Product Service)
    - Validate bid > currentPrice
    - Validate user != seller
    - Store in sorted set
    - Update previous bid status to outbid
    - Publish bid.placed event
    - _Requirements: Section 4 - Endpoints, Business Logic_
  - [ ]* 10.6 Write property test for bid validation invariant
    - **Property 6: Bid Validation Invariant**
    - **Validates: Requirements Bidding Service - Place Bid**

  - [x] 10.7 Implement GET /bids/product/:productId endpoint

    - Retrieve sorted set for productId
    - Return bids in descending order
    - _Requirements: Section 4 - Endpoints_


  - [x] 10.8 Implement GET /bids/product/:productId/highest endpoint
    - Get max score from sorted set

    - _Requirements: Section 4 - Endpoints_
  - [x] 10.9 Implement GET /bids/user/:userId endpoint

    - Retrieve all bids for userId

    - _Requirements: Section 4 - Endpoints_
  - [x] 10.10 Implement GET /bids/product/:productId/winner endpoint
    - Retrieve highest bid when auction ends
    - _Requirements: Section 4 - Endpoints_
  - [ ]* 10.11 Write property test for winner determination consistency
    - **Property 7: Winner Determination Consistency**
    - **Validates: Requirements Bidding Service - Get Winner**


  - [x] 10.12 Implement RabbitMQ consumers and publishers
    - Listen to auction.started (initialize sorted set)
    - Listen to auction.ended (determine winner, publish auction.winner)
    - Publish bid.placed, bid.outbid events


    - _Requirements: Section 4 - Message Queue Listeners/Publishers_
  - [x] 10.13 Create Bidding Service Dockerfile

    - Use node:18-alpine base image
    - Configure health check
    - _Requirements: Deployment Notes_
  - [ ]* 10.14 Write unit tests for Bidding Service
    - Test bid placement logic
    - Test sorted set operations
    - Test winner determination
    - _Requirements: Section 4_

- [x] 11. Checkpoint - Bidding Service





  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Recommendation Service Implementation

- [x] 12. Implement Recommendation Service



  - [x] 12.1 Set up Recommendation Service NestJS application


    - Create recommendation-service app in monorepo
    - Configure Neo4j connection
    - _Requirements: Section 5 - Recommendation Service_
  - [x] 12.2 Implement Neo4j graph schema and repository


    - Create User, Product, Category nodes
    - Create VIEWED, BID, WON, BELONGS_TO, SIMILAR_TO relationships
    - _Requirements: Section 5 - Data Model (Neo4j)_

  - [x] 12.3 Implement GET /recommendations/user/:userId endpoint

    - Find products in categories user has bid on
    - Find products similar to ones user has viewed
    - Rank by relevance score
    - _Requirements: Section 5 - Endpoints, Business Logic_

  - [x] 12.4 Implement GET /recommendations/product/:productId/similar endpoint
    - Find products in same category
    - Find products that same users have bid on
    - Calculate similarity score
    - _Requirements: Section 5 - Endpoints, Business Logic_

  - [x] 12.5 Implement POST /recommendations/train endpoint
    - Rebuild graph relationships based on user interactions

    - _Requirements: Section 5 - Endpoints, Business Logic_
  - [x] 12.6 Implement RabbitMQ consumers

    - Listen to user.created (create User node)
    - Listen to product.created (create Product node and Category relationship)
    - Listen to bid.placed (create BID relationship)
    - Listen to auction.winner (create WON relationship)
    - _Requirements: Section 5 - Message Queue Listeners_


  - [x] 12.7 Create Recommendation Service Dockerfile

    - Use node:18-alpine base image
    - Configure health check
    - _Requirements: Deployment Notes_
  - [ ]* 12.8 Write unit tests for Recommendation Service
    - Test graph operations
    - Test recommendation algorithms
    - Test event handling
    - _Requirements: Section 5_

- [x] 13. Checkpoint - Recommendation Service





  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Integration and Finalization

- [x] 14. Complete Docker Compose integration





  - [x] 14.1 Add all microservices to Docker Compose


    - Add auth-service, user-service, product-service, bidding-service, recommendation-service
    - Configure environment variables
    - Configure service dependencies
    - Configure restart policy: unless-stopped


    - _Requirements: Section 7 - Docker Compose Structure_
  - [x] 14.2 Create environment configuration


    - Create .env.example file with all required variables
    - Document environment variables
    - _Requirements: All Services - Environment Variables_
  - [x] 14.3 Create initialization scripts
    - MongoDB replica set init script
    - Kong routes and plugins configuration
    - RabbitMQ exchanges and queues setup
    - _Requirements: Section 6, 7, 10_

- [x] 15. Final Checkpoint





  - Ensure all tests pass, ask the user if questions arise.
