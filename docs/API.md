# E-Auction Platform API Documentation

## Overview

The E-Auction Platform is a microservices-based auction system with 5 services accessible through Kong API Gateway on port `8000`.

**Base URL:** `http://localhost:8000/api`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Auth Service (`/api/auth`)

### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "buyer",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "role": "buyer"
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": 3600000
    }
  },
  "message": "User registered successfully"
}
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "...",
    "expiresIn": 86400
  }
}
```

### Logout
```
POST /api/auth/logout
Authorization: Bearer <token>
```

### Refresh Token
```
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token-here"
}
```
Note: `userId` is no longer required - it's extracted from the refresh token.

### Verify Session
```
GET /api/auth/verify
Authorization: Bearer <token>
```

---

## User Service (`/api/users`)

### Get User by ID
```
GET /api/users/:id
Authorization: Bearer <token>
```

### Update User
```
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "profile": {
    "name": "John Updated"
  }
}
```

### Delete User (Soft Delete)
```
DELETE /api/users/:id
Authorization: Bearer <token>
```

---

## Product Service (`/api/products`)

### Create Product
```
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Vintage Watch",
  "description": "A beautiful vintage watch from 1960s",
  "category": "watches",
  "images": ["https://example.com/image1.jpg"],
  "startingPrice": 100,
  "buyNowPrice": 500,
  "condition": "used",
  "specifications": {
    "brand": "Rolex",
    "year": 1965
  }
}
```
Note: `sellerId` is automatically extracted from the JWT token.
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "sellerId": "...",
    "title": "Vintage Watch",
    "currentPrice": 100,
    "auction": {
      "status": "draft",
      "totalBids": 0
    }
  }
}
```

### Get Product by ID
```
GET /api/products/:id
```

### Update Product (Draft only)
```
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description"
}
```

### Delete Product (Soft Delete)
```
DELETE /api/products/:id
Authorization: Bearer <token>
```

### List Products (with pagination & filters)
```
GET /api/products?page=1&limit=10&category=watches&status=active
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `category` - Filter by category
- `status` - Filter by auction status (draft, active, ended, cancelled)
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter

### Get Products by Seller
```
GET /api/products/seller/:sellerId
```

### Get Auction Status
```
GET /api/products/:id/auction-status
```

### Start Auction
```
PUT /api/products/:id/start-auction
Authorization: Bearer <token>
Content-Type: application/json

{
  "startTime": "2025-12-03T00:00:00Z",
  "endTime": "2025-12-10T00:00:00Z"
}
```

### End Auction
```
PUT /api/products/:id/end-auction
Authorization: Bearer <token>
```

---

## Bidding Service (`/api/bids`)

### Place Bid
```
POST /api/bids
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product-id",
  "amount": 150
}
```
Note: `userId` is automatically extracted from the JWT token.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "bidId": "...",
    "productId": "...",
    "userId": "...",
    "amount": 150,
    "status": "active",
    "timestamp": 1701500000000
  }
}
```

**Error Responses:**
- `400` - Bid amount must be greater than current price
- `403` - Seller cannot bid on their own product
- `404` - Product not found
- `400` - Auction is not active

### Get Product Bids
```
GET /api/bids/product/:productId
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "bidId": "...",
      "userId": "...",
      "amount": 200,
      "status": "active",
      "timestamp": 1701500000000
    },
    {
      "bidId": "...",
      "userId": "...",
      "amount": 150,
      "status": "outbid",
      "timestamp": 1701499000000
    }
  ]
}
```

### Get Highest Bid
```
GET /api/bids/product/:productId/highest
```

### Get User's Bids
```
GET /api/bids/user/:userId
Authorization: Bearer <token>
```

---

## Recommendation Service (`/api/recommendations`)

The recommendation service uses Neo4j graph database to track user behavior and generate personalized recommendations.

### How Recommendations Work

**Data Collected:**
- User views (when authenticated users view products)
- Bids placed
- Auctions won

**Similarity Score Calculation:**
Products are considered similar based on:
- Same category (+3 points)
- Shared bidders - users who bid on both products (+2 per user)
- Shared viewers - users who viewed both products (+1 per user)
- Pre-computed similarity score from auction data

**User Recommendation Score:**
- Products in categories user has bid on (+2 per category)
- Products similar to ones user viewed (+1.5)
- Recency boost for recently viewed items (+0.5)

Similarity relationships are automatically updated when auctions end.

### Get User Recommendations
```
GET /api/recommendations/user?limit=10
Authorization: Bearer <token>
```

User is identified from the JWT token - no userId in URL needed.

**Query Parameters:**
- `limit` - Number of recommendations (default: 10, max: 50)

**Response (200):**
```json
[
  {
    "productId": "...",
    "title": "Similar Watch",
    "category": "watches",
    "score": 8.5
  }
]
```

### Get Similar Products
```
GET /api/recommendations/product/:productId/similar?limit=10
```

**Query Parameters:**
- `limit` - Number of similar products (default: 10, max: 50)

**Response (200):**
```json
[
  {
    "productId": "...",
    "title": "Another Watch",
    "category": "watches",
    "similarityScore": 12
  }
]
```

---

## Health Checks

Each service exposes a health endpoint:

```
GET /health
```

**Response (200):**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "rabbitmq": { "status": "up" }
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Error description",
    "error": "Bad Request"
  }
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business rule violation)
- `500` - Internal Server Error
