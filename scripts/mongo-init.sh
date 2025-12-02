#!/bin/bash

# ============================================
# MongoDB Replica Set Initialization Script
# ============================================
# This script initializes the MongoDB replica set and creates
# the necessary database and collections for the e-auction platform

echo "============================================"
echo "MongoDB Replica Set Initialization"
echo "============================================"

# Wait for MongoDB primary to be ready
echo "Waiting for MongoDB primary to be ready..."
until mongosh --host mongodb-primary:27017 --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  echo "MongoDB primary not ready yet, waiting..."
  sleep 2
done
echo "MongoDB primary is ready!"

# Wait for secondary nodes to be ready
echo "Waiting for MongoDB secondary nodes..."
until mongosh --host mongodb-secondary1:27017 --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  echo "MongoDB secondary1 not ready yet, waiting..."
  sleep 2
done
echo "MongoDB secondary1 is ready!"

until mongosh --host mongodb-secondary2:27017 --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  echo "MongoDB secondary2 not ready yet, waiting..."
  sleep 2
done
echo "MongoDB secondary2 is ready!"

# Check if replica set is already initialized
echo "Checking replica set status..."
RS_STATUS=$(mongosh --host mongodb-primary:27017 --quiet --eval "try { rs.status().ok } catch(e) { 0 }" 2>/dev/null || echo "0")

if [ "$RS_STATUS" != "1" ]; then
  echo "Initializing replica set..."
  mongosh --host mongodb-primary:27017 --eval '
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongodb-primary:27017", priority: 2 },
        { _id: 1, host: "mongodb-secondary1:27017", priority: 1 },
        { _id: 2, host: "mongodb-secondary2:27017", priority: 1 }
      ]
    });
  ' || echo "Replica set may already be initialized"
  echo "Replica set initialization attempted!"
else
  echo "Replica set already initialized, skipping..."
fi

# Wait for replica set to elect a primary
echo "Waiting for replica set to elect a primary..."
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  IS_PRIMARY=$(mongosh --host mongodb-primary:27017 --quiet --eval "rs.isMaster().ismaster" 2>/dev/null || echo "false")
  if [ "$IS_PRIMARY" = "true" ]; then
    echo "Primary elected!"
    break
  fi
  echo "Waiting for primary election... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Warning: Primary election timeout, but continuing..."
fi

# Create the eauction database and collections (idempotent operations)
echo "Creating database and collections..."
mongosh --host mongodb-primary:27017 --eval '
  // Switch to eauction database
  db = db.getSiblingDB("eauction");

  // Create users collection with indexes (createCollection is idempotent)
  try { db.createCollection("users"); } catch(e) { print("users collection may already exist"); }
  db.users.createIndex({ "email": 1 }, { unique: true });
  db.users.createIndex({ "role": 1 });
  db.users.createIndex({ "deletedAt": 1 });
  db.users.createIndex({ "createdAt": -1 });

  // Create products collection with indexes
  try { db.createCollection("products"); } catch(e) { print("products collection may already exist"); }
  db.products.createIndex({ "sellerId": 1 });
  db.products.createIndex({ "category": 1 });
  db.products.createIndex({ "auction.status": 1 });
  db.products.createIndex({ "auction.endTime": 1 });
  db.products.createIndex({ "deletedAt": 1 });
  db.products.createIndex({ "createdAt": -1 });
  db.products.createIndex({ "currentPrice": 1 });

  print("Database and collections created successfully!");
  print("Indexes created:");
  print("Users indexes: " + JSON.stringify(db.users.getIndexes().map(i => i.name)));
  print("Products indexes: " + JSON.stringify(db.products.getIndexes().map(i => i.name)));
' || echo "Warning: Some database operations may have failed, but continuing..."

echo "============================================"
echo "MongoDB initialization completed!"
echo "============================================"

exit 0
