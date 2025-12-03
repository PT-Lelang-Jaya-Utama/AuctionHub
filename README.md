# CampusHub-Action - E-Auction Platform

Platform lelang online berbasis mikroservis dengan polyglot persistence menggunakan NestJS, MongoDB, Redis, Neo4j, RabbitMQ, dan Kong API Gateway.

## 📋 Daftar Isi

- [Arsitektur](#-arsitektur)
- [Teknologi](#-teknologi)
- [Microservices](#-microservices)
- [Database Strategy](#-database-strategy)
- [Prerequisites](#-prerequisites)
- [Instalasi](#-instalasi)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Struktur Folder](#-struktur-folder)
- [Testing](#-testing)

## 🏗 Arsitektur

Platform ini dibangun dengan arsitektur mikroservis menggunakan pola **Polyglot Persistence**, di mana setiap service menggunakan database yang paling sesuai dengan kebutuhannya:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Kong API Gateway (Port 8000)                │
│                  Rate Limiting, CORS, Security                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─── /api/auth          → Auth Service (3000)
             ├─── /api/users         → User Service (3001)
             ├─── /api/products      → Product Service (3002)
             ├─── /api/bids          → Bidding Service (3003)
             └─── /api/recommendations → Recommendation Service (3004)
                              │
                              ▼
                    ┌──────────────────┐
                    │   RabbitMQ       │
                    │  Message Broker  │
                    └──────────────────┘
```

### Event-Driven Communication

Service berkomunikasi menggunakan **RabbitMQ** dengan pola Topic Exchange:

- **user.events**: Event terkait user (registered, updated, deleted)
- **product.events**: Event terkait produk (created, updated, auction.started, auction.ended)
- **bid.events**: Event terkait bidding (placed, outbid, won)

## 🛠 Teknologi

### Backend Framework
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Node.js 18** - Runtime environment

### Databases (Polyglot Persistence)
- **MongoDB Replica Set** - Document database untuk User & Product data
  - Primary + 2 Secondary nodes (High Availability)
- **Redis Master-Slave + Sentinel** - In-memory database untuk Session & Bidding data
  - Master-Slave replication dengan automatic failover
- **Neo4j** - Graph database untuk Recommendation system

### Message Broker
- **RabbitMQ** - Event-driven communication antar services

### API Gateway
- **Kong** - API Gateway dengan rate limiting, CORS, dan security plugins
- **PostgreSQL** - Kong configuration database

### Containerization
- **Docker & Docker Compose** - Container orchestration

## 🎯 Microservices

### 1. Auth Service (Port 3000)
**Database**: Redis (Session & Refresh Tokens)

**Fitur**:
- User registration & login
- JWT-based authentication
- Session management dengan Redis
- Refresh token rotation
- Logout functionality

**Endpoints**:
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/verify` - Verify session

### 2. User Service (Port 3001)
**Database**: MongoDB (User data)

**Fitur**:
- User profile management
- Role-based access (buyer/seller/admin)
- Seller & buyer info tracking
- User statistics (bids won, products sold)
- Soft delete functionality

**Endpoints**:
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Soft delete user

**Schema**:
```typescript
{
  email: string (unique)
  password: string (hashed)
  role: 'buyer' | 'seller' | 'admin'
  profile: {
    name: string
    phone: string
    address: Address
    avatar: string
  }
  sellerInfo?: {
    rating: number
    totalSales: number
    verifiedSeller: boolean
  }
  buyerInfo?: {
    totalBids: number
    auctionsWon: number
  }
  deletedAt?: Date
}
```

### 3. Product Service (Port 3002)
**Database**: MongoDB (Product & Auction data)

**Fitur**:
- Product CRUD operations
- Auction lifecycle management (draft → active → ended)
- Category & price filtering
- Seller product management
- Product search & pagination

**Endpoints**:
- `POST /api/products` - Create product
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product (draft only)
- `DELETE /api/products/:id` - Soft delete product
- `PUT /api/products/:id/start-auction` - Start auction
- `PUT /api/products/:id/end-auction` - End auction
- `GET /api/products/seller/:sellerId` - Get seller's products

**Schema**:
```typescript
{
  sellerId: string
  title: string
  description: string
  category: string
  images: string[]
  startingPrice: number
  currentPrice: number
  buyNowPrice?: number
  condition: 'new' | 'used'
  specifications: object
  auction: {
    status: 'draft' | 'active' | 'ended' | 'cancelled'
    startTime?: Date
    endTime?: Date
    totalBids: number
    highestBidderId?: string
  }
  deletedAt?: Date
}
```

### 4. Bidding Service (Port 3003)
**Database**: Redis (Real-time bid data)

**Fitur**:
- Real-time bid placement
- Bid validation (amount, seller restriction)
- Bid history tracking dengan Redis Sorted Sets
- Automatic bid status updates (active → outbid)
- Event publishing untuk recommendation service

**Endpoints**:
- `POST /api/bids` - Place bid
- `GET /api/bids/product/:productId` - Get product bids
- `GET /api/bids/product/:productId/highest` - Get highest bid
- `GET /api/bids/user/:userId` - Get user's bids

**Redis Data Structure**:
```
bids:product:{productId} → Sorted Set (score: amount)
bid:{bidId} → Hash (userId, amount, status, timestamp)
user:{userId}:bids → Set (bidIds)
```

### 5. Recommendation Service (Port 3004)
**Database**: Neo4j (Graph database)

**Fitur**:
- User behavior tracking (views, bids, wins)
- Product similarity calculation
- Personalized recommendations
- Category-based suggestions
- Real-time graph updates via RabbitMQ events

**Endpoints**:
- `GET /api/recommendations/user` - Get user recommendations
- `GET /api/recommendations/product/:productId/similar` - Get similar products

**Graph Model**:
```cypher
(User)-[:VIEWED]->(Product)
(User)-[:BID_ON]->(Product)
(User)-[:WON]->(Product)
(Product)-[:SIMILAR_TO]->(Product)
(Product)-[:IN_CATEGORY]->(Category)
```

**Recommendation Algorithm**:
- Similarity Score: Same category (+3), Shared bidders (+2/user), Shared viewers (+1/user)
- User Score: Categories user bid on (+2), Similar to viewed products (+1.5), Recency boost (+0.5)

## 💾 Database Strategy

### Polyglot Persistence Pattern

| Service | Database | Alasan Pemilihan |
|---------|----------|------------------|
| Auth | Redis | Fast session lookup, TTL support, Pub/Sub |
| User | MongoDB | Flexible schema, Document model cocok untuk user profiles |
| Product | MongoDB | Complex nested data (auction, specs), GridFS untuk images |
| Bidding | Redis | Real-time performance, Sorted Sets untuk bid ranking |
| Recommendation | Neo4j | Graph relationships, Complex traversal queries |

### High Availability Setup

**MongoDB Replica Set**:
```
Primary (27017) ← Read/Write
   ├── Secondary 1 (27018) ← Read
   └── Secondary 2 (27019) ← Read
```

**Redis Master-Slave + Sentinel**:
```
Master (6379) ← Write
   └── Slave (6380) ← Read
Sentinel (26379) ← Monitoring & Failover
```

## 📦 Prerequisites

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Node.js** >= 18 (untuk development)
- **npm** atau **yarn**

## 🚀 Instalasi

### 1. Clone Repository
```bash
git clone <repository-url>
cd CampusHub-Action
```

### 2. Install Dependencies (untuk development)
```bash
npm install
```

### 3. Setup Environment Variables
Buat file `.env` di root directory:
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# Neo4j Configuration
NEO4J_PASSWORD=password
```

## 🏃‍♂️ Menjalankan Aplikasi

### Production Mode (Docker Compose)

#### Start semua services:
```bash
docker-compose up -d
```

#### Stop semua services:
```bash
docker-compose down
```

#### View logs:
```bash
# Semua services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f rabbitmq
```

#### Restart service:
```bash
docker-compose restart auth-service
```

### Development Mode (Local)

#### 1. Start infrastructure (databases & message broker):
```bash
docker-compose up -d redis-master redis-slave redis-sentinel \
  mongodb-primary mongodb-secondary1 mongodb-secondary2 mongodb-init \
  neo4j rabbitmq rabbitmq-init kong-database kong-migrations kong
```

#### 2. Start services:
```bash
# Auth Service
npm run start:dev auth-service

# User Service  
npm run start:dev user-service

# Product Service
npm run start:dev product-service

# Bidding Service
npm run start:dev bidding-service

# Recommendation Service
npm run start:dev recommendation-service
```

## 📡 API Documentation

**Base URL**: `http://localhost:8000/api`

Dokumentasi lengkap API tersedia di [docs/API.md](docs/API.md)

### Quick Start Examples

#### 1. Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "buyer",
    "name": "John Doe"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### 3. Create Product (dengan token)
```bash
curl -X POST http://localhost:8000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Vintage Watch",
    "description": "Beautiful vintage watch from 1960s",
    "category": "watches",
    "images": ["https://example.com/image.jpg"],
    "startingPrice": 100,
    "buyNowPrice": 500,
    "condition": "used"
  }'
```

#### 4. Place Bid
```bash
curl -X POST http://localhost:8000/api/bids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "productId": "PRODUCT_ID",
    "amount": 150
  }'
```

### Health Checks

Setiap service memiliki health endpoint:
```bash
curl http://localhost:8000/health/auth
curl http://localhost:8000/health/users
curl http://localhost:8000/health/products
curl http://localhost:8000/health/bids
curl http://localhost:8000/health/recommendations
```

## 🌐 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Kong API Gateway | http://localhost:8000 | - |
| Kong Admin API | http://localhost:8001 | - |
| RabbitMQ Management | http://localhost:15672 | guest/guest |
| Neo4j Browser | http://localhost:7474 | neo4j/password |
| MongoDB Primary | mongodb://localhost:27017 | - |
| Redis Master | redis://localhost:6379 | - |

## 🔧 Environment Variables

### Common Variables (semua services)
```env
NODE_ENV=production
JWT_SECRET=your-secret-key
```

### Auth Service
```env
PORT=3000
REDIS_SENTINEL_HOSTS=redis-sentinel:26379
REDIS_MASTER_NAME=mymaster
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d
USER_SERVICE_URL=http://user-service:3001
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

### User Service
```env
PORT=3001
MONGODB_URI=mongodb://mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/eauction?replicaSet=rs0
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

### Product Service
```env
PORT=3002
MONGODB_URI=mongodb://mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/eauction?replicaSet=rs0
USER_SERVICE_URL=http://user-service:3001
BIDDING_SERVICE_URL=http://bidding-service:3003
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

### Bidding Service
```env
PORT=3003
REDIS_SENTINEL_HOSTS=redis-sentinel:26379
REDIS_MASTER_NAME=mymaster
PRODUCT_SERVICE_URL=http://product-service:3002
USER_SERVICE_URL=http://user-service:3001
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

### Recommendation Service
```env
PORT=3004
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

## 📁 Struktur Folder

```
CampusHub-Action/
├── apps/                          # Microservices
│   ├── auth-service/              # Authentication & Session Management
│   │   ├── src/
│   │   │   ├── auth/              # Auth logic
│   │   │   ├── session/           # Session repository
│   │   │   ├── redis/             # Redis connection
│   │   │   ├── jwt/               # JWT configuration
│   │   │   └── user-client/       # User service client
│   │   └── Dockerfile
│   ├── user-service/              # User Management
│   │   ├── src/
│   │   │   ├── user/              # User logic & schema
│   │   │   └── database/          # MongoDB connection
│   │   └── Dockerfile
│   ├── product-service/           # Product & Auction Management
│   │   ├── src/
│   │   │   ├── product/           # Product logic & schema
│   │   │   ├── database/          # MongoDB connection
│   │   │   └── clients/           # Other service clients
│   │   └── Dockerfile
│   ├── bidding-service/           # Real-time Bidding
│   │   ├── src/
│   │   │   ├── bid/               # Bid logic
│   │   │   │   ├── repositories/  # Redis repositories
│   │   │   │   └── consumers/     # RabbitMQ consumers
│   │   │   ├── redis/             # Redis connection
│   │   │   └── clients/           # Other service clients
│   │   └── Dockerfile
│   └── recommendation-service/    # Recommendation Engine
│       ├── src/
│       │   ├── recommendation/    # Recommendation logic
│       │   │   └── consumers/     # RabbitMQ consumers
│       │   └── neo4j/             # Neo4j connection
│       └── Dockerfile
├── libs/                          # Shared Libraries
│   ├── shared/                    # Shared utilities
│   │   └── src/
│   │       ├── dto/               # Data Transfer Objects
│   │       ├── interfaces/        # TypeScript interfaces
│   │       ├── guards/            # JWT auth guard
│   │       ├── decorators/        # Custom decorators
│   │       ├── errors/            # Custom errors
│   │       └── constants/         # Shared constants
│   ├── rabbitmq/                  # RabbitMQ integration
│   │   └── src/
│   │       ├── services/          # RabbitMQ service
│   │       ├── constants/         # Exchanges, Queues, Routing Keys
│   │       ├── decorators/        # @Consume decorator
│   │       └── interfaces/        # Message interfaces
│   └── health/                    # Health check module
│       └── src/
│           ├── indicators/        # Custom health indicators
│           └── health.controller.ts
├── config/                        # Configuration files
│   └── redis/
│       └── sentinel.conf          # Redis Sentinel config
├── scripts/                       # Initialization scripts
│   ├── mongo-init.sh              # MongoDB replica set setup
│   ├── kong-init.sh               # Kong routes & plugins
│   └── rabbitmq-init.sh           # RabbitMQ exchanges & queues
├── docs/                          # Documentation
│   ├── API.md                     # API documentation
│   └── openapi.yaml               # OpenAPI specification
├── docker-compose.yml             # Docker orchestration
├── nest-cli.json                  # NestJS CLI config
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Test Structure
```
apps/
└── <service-name>/
    └── src/
        └── <module>/
            ├── <module>.controller.spec.ts
            ├── <module>.service.spec.ts
            └── <module>.repository.spec.ts
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication dengan short-lived access tokens
- Refresh token rotation untuk extended sessions
- Session management dengan Redis TTL
- Role-based access control (buyer/seller/admin)

### API Gateway (Kong)
- Rate limiting (100 requests/minute)
- CORS configuration
- Security headers (X-Frame-Options, X-Content-Type-Options)
- Request correlation ID
- API key authentication ready

### Application Security
- Password hashing dengan bcryptjs
- Input validation dengan class-validator
- SQL/NoSQL injection prevention
- XSS protection
- HTTPS ready (production)

## 📊 Monitoring & Observability

### Health Checks
Setiap service memiliki health endpoint yang memonitor:
- Database connectivity
- RabbitMQ connection
- Service uptime
- Memory usage

### Logging
- Structured logging dengan NestJS Logger
- Correlation ID untuk request tracking
- Error logging dengan stack traces

### Metrics (Ready to integrate)
- Prometheus metrics endpoint ready
- Grafana dashboard templates available
- RabbitMQ metrics via management plugin
- Kong metrics via Admin API

## 🔄 Event Flow Examples

### User Registration Flow
```
1. Client → POST /api/auth/register
2. Auth Service → Create User (HTTP) → User Service
3. User Service → Save to MongoDB
4. User Service → Publish user.registered → RabbitMQ
5. Auth Service → Create Session → Redis
6. Auth Service → Generate JWT → Client
7. Recommendation Service ← Subscribe user.registered
8. Recommendation Service → Create User Node → Neo4j
```

### Bid Placement Flow
```
1. Client → POST /api/bids
2. Bidding Service → Validate Auction → Product Service
3. Bidding Service → Place Bid → Redis Sorted Set
4. Bidding Service → Publish bid.placed → RabbitMQ
5. Product Service ← Subscribe bid.placed
6. Product Service → Update currentPrice → MongoDB
7. Recommendation Service ← Subscribe bid.placed
8. Recommendation Service → Create BID_ON relationship → Neo4j
```

### Auction End Flow
```
1. Product Service → End Auction
2. Product Service → Get Highest Bid → Bidding Service
3. Product Service → Update Auction Status → MongoDB
4. Product Service → Publish auction.ended → RabbitMQ
5. Recommendation Service ← Subscribe auction.ended
6. Recommendation Service → Calculate Product Similarity → Neo4j
7. Recommendation Service → Create SIMILAR_TO relationships
```

## 🚧 Troubleshooting

### MongoDB Replica Set tidak initialized
```bash
# Restart mongodb-init service
docker-compose restart mongodb-init

# Check logs
docker-compose logs mongodb-init
```

### Redis Sentinel tidak connect
```bash
# Check Sentinel config
docker-compose exec redis-sentinel cat /etc/redis/sentinel.conf

# Restart Sentinel
docker-compose restart redis-sentinel
```

### Service tidak bisa connect ke RabbitMQ
```bash
# Check RabbitMQ status
docker-compose exec rabbitmq rabbitmq-diagnostics status

# Check exchanges
curl -u guest:guest http://localhost:15672/api/exchanges
```

### Kong route tidak working
```bash
# Re-run Kong initialization
docker-compose restart kong-init

# Check Kong routes
curl http://localhost:8001/routes
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **PT Kampus Jaya Utama** - Teknologi Basis Data Non Relational

## 🙏 Acknowledgments

- NestJS Team untuk framework yang luar biasa
- MongoDB, Redis, Neo4j communities
- Kong & RabbitMQ documentation
- Docker & container ecosystem

---

**Built with ❤️ using NestJS and Polyglot Persistence**
