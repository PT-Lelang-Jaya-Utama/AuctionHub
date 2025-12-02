#!/bin/bash

# ============================================
# RabbitMQ Exchanges and Queues Setup Script
# ============================================
# This script creates the necessary exchanges and queues
# for the e-auction platform inter-service communication

set -e

echo "============================================"
echo "RabbitMQ Exchanges and Queues Setup"
echo "============================================"

# RabbitMQ connection settings
RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
RABBITMQ_PORT=${RABBITMQ_MANAGEMENT_PORT:-15672}
RABBITMQ_USER=${RABBITMQ_DEFAULT_USER:-guest}
RABBITMQ_PASS=${RABBITMQ_DEFAULT_PASS:-guest}

API_URL="http://${RABBITMQ_HOST}:${RABBITMQ_PORT}/api"
AUTH="${RABBITMQ_USER}:${RABBITMQ_PASS}"

# Wait for RabbitMQ to be ready
echo "Waiting for RabbitMQ to be ready..."
until curl -s -u "${AUTH}" "${API_URL}/overview" > /dev/null 2>&1; do
  echo "RabbitMQ not ready yet, waiting..."
  sleep 2
done
echo "RabbitMQ is ready!"

# Function to create exchange
create_exchange() {
  local name=$1
  local type=$2
  echo "Creating exchange: ${name} (${type})"
  curl -s -u "${AUTH}" -X PUT "${API_URL}/exchanges/%2F/${name}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"${type}\",\"durable\":true,\"auto_delete\":false}"
  echo ""
}

# Function to create queue
create_queue() {
  local name=$1
  echo "Creating queue: ${name}"
  curl -s -u "${AUTH}" -X PUT "${API_URL}/queues/%2F/${name}" \
    -H "Content-Type: application/json" \
    -d '{"durable":true,"auto_delete":false}'
  echo ""
}

# Function to create binding
create_binding() {
  local exchange=$1
  local queue=$2
  local routing_key=$3
  echo "Binding queue ${queue} to exchange ${exchange} with routing key ${routing_key}"
  curl -s -u "${AUTH}" -X POST "${API_URL}/bindings/%2F/e/${exchange}/q/${queue}" \
    -H "Content-Type: application/json" \
    -d "{\"routing_key\":\"${routing_key}\"}"
  echo ""
}

# ============================================
# Create Exchanges
# ============================================
echo ""
echo "Creating exchanges..."

# User events exchange
create_exchange "user.events" "topic"

# Product events exchange
create_exchange "product.events" "topic"

# Bid events exchange
create_exchange "bid.events" "topic"

# ============================================
# Create Queues
# ============================================
echo ""
echo "Creating queues..."

# User event queues
create_queue "user.created"
create_queue "user.updated"
create_queue "user.deleted"

# Product event queues
create_queue "product.created"
create_queue "product.updated"
create_queue "product.deleted"
create_queue "auction.started"
create_queue "auction.ended"

# Bid event queues
create_queue "bid.placed"
create_queue "bid.outbid"
create_queue "auction.winner"

# Dead letter queues
create_queue "user.events.dlq"
create_queue "product.events.dlq"
create_queue "bid.events.dlq"

# ============================================
# Create Bindings
# ============================================
echo ""
echo "Creating bindings..."

# User events bindings
create_binding "user.events" "user.created" "user.created"
create_binding "user.events" "user.updated" "user.updated"
create_binding "user.events" "user.deleted" "user.deleted"

# Product events bindings
create_binding "product.events" "product.created" "product.created"
create_binding "product.events" "product.updated" "product.updated"
create_binding "product.events" "product.deleted" "product.deleted"
create_binding "product.events" "auction.started" "auction.started"
create_binding "product.events" "auction.ended" "auction.ended"

# Bid events bindings
create_binding "bid.events" "bid.placed" "bid.placed"
create_binding "bid.events" "bid.outbid" "bid.outbid"
create_binding "bid.events" "auction.winner" "auction.winner"

echo ""
echo "============================================"
echo "RabbitMQ setup completed!"
echo "============================================"
echo ""
echo "Created exchanges:"
echo "  - user.events (topic)"
echo "  - product.events (topic)"
echo "  - bid.events (topic)"
echo ""
echo "Created queues:"
echo "  - user.created, user.updated, user.deleted"
echo "  - product.created, product.updated, product.deleted"
echo "  - auction.started, auction.ended"
echo "  - bid.placed, bid.outbid, auction.winner"
echo "  - Dead letter queues for error handling"
echo ""
