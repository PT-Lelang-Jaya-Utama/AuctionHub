# Requirements Document: E-Auction Platform dengan Polyglot Persistence

## Tech Stack Overview

### Framework & Runtime
- **Backend Framework**: NestJS (Node.js)
- **API Gateway**: Kong Gateway
- **Container**: Docker & Docker Compose
- **Message Queue**: RabbitMQ (untuk koordinasi antar service)

### Databases
- **Redis**: Master-Slave dengan Sentinel (Auth & Bidding Service)
- **MongoDB**: Replica Set Master-Slave (User & Product Service)
- **Neo4j**: Single Instance (Recommendation Service)

---

## Architecture Overview

### Microservices
1. Auth Service (NestJS + Redis)
2. User Service (NestJS + MongoDB)
3. Product Service (NestJS + MongoDB)
4. Bidding Service (NestJS + Redis)
5. Recommendation Service (NestJS + Neo4j)

### Infrastructure Components
- Kong API Gateway (entry point)
- RabbitMQ (message broker)
- Redis Sentinel (3 instances: 1 master, 1 slave, 1 sentinel)
- MongoDB Replica Set (1 primary, 2 secondary)
- Neo4j Single Instance

---

## 1. AUTH SERVICE

### Database
- **Redis Master-Slave with Sentinel**
- Port: 6379 (master), 6380 (slave), 26379 (sentinel)

### Endpoints
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
GET    /auth/verify
```

### Data Model (Redis)
```
Key Pattern: session:{sessionId}
Value: {
  userId: string,
  email: string,
  role: string (buyer|seller),
  createdAt: timestamp,
  expiresAt: timestamp
}
TTL: 24 hours

Key Pattern: refresh:{userId}
Value: {
  token: string,
  expiresAt: timestamp
}
TTL: 7 days
```

### Business Logic
- Register user: validate email, hash password, create user via User Service
- Login: validate credentials, create session in Redis, return JWT token
- Logout: delete session from Redis
- Refresh token: validate refresh token, create new session
- Verify: check session exists in Redis

### Environment Variables
```
REDIS_SENTINEL_HOSTS=redis-sentinel:26379
REDIS_MASTER_NAME=mymaster
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d
USER_SERVICE_URL=http://user-service:3001
RABBITMQ_URL=amqp://rabbitmq:5672
```

---

## 2. USER SERVICE

### Database
- **MongoDB Replica Set (Master-Slave)**
- Port: 27017 (primary), 27018, 27019 (secondary)

### Endpoints
```
POST   /users
GET    /users/:id
PUT    /users/:id
DELETE /users/:id
GET    /users/:id/profile
PUT    /users/:id/profile
GET    /users/seller/:sellerId/products
GET    /users/buyer/:buyerId/bids
```

### Data Model (MongoDB)
```javascript
User Collection:
{
  _id: ObjectId,
  email: string (unique),
  password: string (hashed),
  role: string (buyer|seller),
  profile: {
    name: string,
    phone: string,
    address: {
      street: string,
      city: string,
      province: string,
      postalCode: string
    },
    avatar: string (url)
  },
  seller: {
    companyName: string,
    description: string,
    rating: number,
    totalSales: number
  },
  buyer: {
    totalBids: number,
    totalWins: number
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp (soft delete)
}
```

### Business Logic
- Create user: validate email uniqueness, hash password, store in MongoDB
- Get user: retrieve user by ID
- Update user: update user profile, handle role-specific fields
- Delete user: soft delete (set deletedAt)
- Get seller products: aggregate with Product Service data
- Get buyer bids: aggregate with Bidding Service data

### Message Queue Listeners
- `user.created`: Publish saat user dibuat (untuk Recommendation Service)
- `user.updated`: Publish saat user diupdate
- `user.deleted`: Publish saat user dihapus

### Environment Variables
```
MONGODB_URI=mongodb://mongodb-primary:27017,mongodb-secondary1:27018,mongodb-secondary2:27019/eauction?replicaSet=rs0
RABBITMQ_URL=amqp://rabbitmq:5672
```

---

## 3. PRODUCT SERVICE

### Database
- **MongoDB Replica Set (Master-Slave)**
- Port: 27017 (primary), 27018, 27019 (secondary)

### Endpoints
```
POST   /products
GET    /products/:id
PUT    /products/:id
DELETE /products/:id
GET    /products
GET    /products/seller/:sellerId
GET    /products/category/:category
GET    /products/:id/auction-status
PUT    /products/:id/start-auction
PUT    /products/:id/end-auction
```

### Data Model (MongoDB)
```javascript
Product Collection:
{
  _id: ObjectId,
  sellerId: string,
  title: string,
  description: string,
  category: string,
  images: [string] (urls),
  startingPrice: number,
  currentPrice: number,
  buyNowPrice: number (optional),
  condition: string (new|used),
  specifications: {
    key: value (flexible schema)
  },
  auction: {
    status: string (draft|active|ended|cancelled),
    startTime: timestamp,
    endTime: timestamp,
    winnerId: string (nullable),
    totalBids: number
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp (soft delete)
}
```

### Business Logic
- Create product: validate sellerId via User Service, set status as draft
- Update product: only allow if status is draft
- Delete product: soft delete
- Get products: list with pagination and filters
- Start auction: validate time, set status to active, publish event
- End auction: set status to ended, get winner from Bidding Service, update winnerId

### Message Queue Listeners
- `bid.placed`: Update currentPrice and totalBids
- `auction.ended`: Update auction status and winnerId

### Message Queue Publishers
- `product.created`: Publish saat produk dibuat (untuk Recommendation Service)
- `product.updated`: Publish saat produk diupdate
- `product.deleted`: Publish saat produk dihapus
- `auction.started`: Publish saat auction dimulai
- `auction.ended`: Publish saat auction berakhir

### Environment Variables
```
MONGODB_URI=mongodb://mongodb-primary:27017,mongodb-secondary1:27018,mongodb-secondary2:27019/eauction?replicaSet=rs0
USER_SERVICE_URL=http://user-service:3001
BIDDING_SERVICE_URL=http://bidding-service:3003
RABBITMQ_URL=amqp://rabbitmq:5672
```

---

## 4. BIDDING SERVICE

### Database
- **Redis Master-Slave with Sentinel**
- Port: 6379 (master), 6380 (slave), 26379 (sentinel)

### Endpoints
```
POST   /bids
GET    /bids/product/:productId
GET    /bids/product/:productId/highest
GET    /bids/user/:userId
GET    /bids/product/:productId/winner
```

### Data Model (Redis)
```
Key Pattern: bids:{productId}
Type: Sorted Set
Score: bid amount (descending)
Member: {userId}:{bidAmount}:{timestamp}

Key Pattern: bid:{bidId}
Value: {
  bidId: string,
  productId: string,
  userId: string,
  amount: number,
  timestamp: timestamp,
  status: string (active|outbid|winner)
}
TTL: 30 days after auction ends

Key Pattern: user:bids:{userId}
Type: List
Value: [bidId1, bidId2, ...]
```

### Business Logic
- Place bid: validate auction active, validate bid > currentPrice, validate user != seller, store in sorted set, update previous bid status to outbid, publish event
- Get product bids: retrieve sorted set for productId
- Get highest bid: get max score from sorted set
- Get user bids: retrieve all bids for userId
- Get winner: retrieve highest bid when auction ends

### Message Queue Listeners
- `auction.started`: Initialize sorted set for productId
- `auction.ended`: Determine winner, publish winner event

### Message Queue Publishers
- `bid.placed`: Publish saat bid berhasil (untuk Product Service & Recommendation Service)
- `bid.outbid`: Publish saat user bid tertimpa
- `auction.winner`: Publish saat auction berakhir dengan winner

### Environment Variables
```
REDIS_SENTINEL_HOSTS=redis-sentinel:26379
REDIS_MASTER_NAME=mymaster
PRODUCT_SERVICE_URL=http://product-service:3002
USER_SERVICE_URL=http://user-service:3001
RABBITMQ_URL=amqp://rabbitmq:5672
```

---

## 5. RECOMMENDATION SERVICE

### Database
- **Neo4j Single Instance**
- Port: 7687 (bolt), 7474 (http)

### Endpoints
```
GET    /recommendations/user/:userId
GET    /recommendations/product/:productId/similar
POST   /recommendations/train
```

### Data Model (Neo4j)
```cypher
// Nodes
(:User {userId: string, role: string})
(:Product {productId: string, category: string, title: string})
(:Category {name: string})

// Relationships
(:User)-[:VIEWED {timestamp: timestamp}]->(:Product)
(:User)-[:BID {amount: number, timestamp: timestamp}]->(:Product)
(:User)-[:WON {timestamp: timestamp}]->(:Product)
(:Product)-[:BELONGS_TO]->(:Category)
(:Product)-[:SIMILAR_TO {score: number}]->(:Product)
```

### Business Logic
- Get user recommendations: 
  - Find products in categories user has bid on
  - Find products similar to ones user has viewed
  - Rank by relevance score
- Get similar products:
  - Find products in same category
  - Find products that same users have bid on
  - Calculate similarity score
- Train: rebuild graph relationships based on user interactions

### Message Queue Listeners
- `user.created`: Create User node
- `product.created`: Create Product node and Category relationship
- `bid.placed`: Create BID relationship
- `auction.winner`: Create WON relationship

### Environment Variables
```
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
RABBITMQ_URL=amqp://rabbitmq:5672
```

---

## 6. KONG API GATEWAY CONFIGURATION

### Routes
```yaml
Auth Service:
- /api/auth/* -> http://auth-service:3000

User Service:
- /api/users/* -> http://user-service:3001

Product Service:
- /api/products/* -> http://product-service:3002

Bidding Service:
- /api/bids/* -> http://bidding-service:3003

Recommendation Service:
- /api/recommendations/* -> http://recommendation-service:3004
```

### Plugins
- rate-limiting: 100 requests per minute
- jwt: validate JWT token dari Auth Service
- cors: enable cross-origin requests

---

## 7. DOCKER COMPOSE STRUCTURE

### Services
```yaml
1. kong-database (PostgreSQL untuk Kong)
2. kong (API Gateway)
3. rabbitmq (Message Broker)
4. redis-master (Redis Master)
5. redis-slave (Redis Slave)
6. redis-sentinel (Redis Sentinel)
7. mongodb-primary (MongoDB Primary)
8. mongodb-secondary1 (MongoDB Secondary)
9. mongodb-secondary2 (MongoDB Secondary)
10. neo4j (Neo4j Single Instance)
11. auth-service (NestJS)
12. user-service (NestJS)
13. product-service (NestJS)
14. bidding-service (NestJS)
15. recommendation-service (NestJS)
```

### Networks
- eauction-network (bridge)

### Volumes
- redis-master-data
- redis-slave-data
- mongodb-primary-data
- mongodb-secondary1-data
- mongodb-secondary2-data
- neo4j-data
- kong-database-data
- rabbitmq-data

---

## 8. BUSINESS FLOW

### Auction Flow
1. Seller creates product via Product Service → status: draft
2. Seller starts auction → Product Service sets status: active, publishes `auction.started`
3. Bidding Service initializes sorted set untuk product
4. Buyers place bids → Bidding Service validates & stores, publishes `bid.placed`
5. Product Service updates currentPrice via message queue
6. Recommendation Service creates BID relationships
7. Auction ends (manual atau scheduled) → Product Service publishes `auction.ended`
8. Bidding Service determines winner, publishes `auction.winner`
9. Product Service updates winnerId

### User Registration Flow
1. User registers via Auth Service
2. Auth Service creates user via User Service
3. User Service stores in MongoDB, publishes `user.created`
4. Recommendation Service creates User node

### Recommendation Flow
1. User views/bids products → events stored in Neo4j
2. Recommendation Service builds graph relationships
3. When user requests recommendations → traverse graph untuk similar products

---

## 9. DATA CONSISTENCY STRATEGY

### MongoDB Replica Set
- Write concern: majority
- Read preference: primaryPreferred
- Soft delete untuk maintain data history

### Redis Sentinel
- Automatic failover < 30 seconds
- Strong consistency untuk bidding
- Session expiration otomatis via TTL

### Neo4j
- Eventually consistent via message queue
- Rebuild capability via train endpoint
- Non-critical service (dapat down tanpa impact auction)

---

## 10. INTER-SERVICE COMMUNICATION

### Synchronous (HTTP)
- Auth Service → User Service: validate user
- Product Service → User Service: validate seller
- Product Service → Bidding Service: get winner

### Asynchronous (RabbitMQ)
- All services publish events
- Recommendation Service consumes all events
- Product Service consumes bid events
- Bidding Service consumes auction events

### Exchanges & Queues
```
Exchange: user.events (topic)
- Queue: user.created
- Queue: user.updated
- Queue: user.deleted

Exchange: product.events (topic)
- Queue: product.created
- Queue: product.updated
- Queue: product.deleted
- Queue: auction.started
- Queue: auction.ended

Exchange: bid.events (topic)
- Queue: bid.placed
- Queue: bid.outbid
- Queue: auction.winner
```

---

## DEPLOYMENT NOTES

- Setiap service memiliki Dockerfile sendiri
- Base image: node:18-alpine
- Health checks pada semua services
- Restart policy: unless-stopped
- Kong Gateway sebagai single entry point (port 8000)
- MongoDB replica set initialization via init script
- Redis sentinel configuration via config files
- Environment variables via .env file
- All services dalam satu docker-compose.yml