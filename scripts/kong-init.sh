#!/bin/bash

# ============================================
# Kong API Gateway Configuration Script
# ============================================
# This script configures Kong routes and plugins
# for the e-auction platform

set -e

echo "============================================"
echo "Kong API Gateway Configuration"
echo "============================================"

KONG_ADMIN_URL=${KONG_ADMIN_URL:-http://kong:8001}

# Wait for Kong to be ready
echo "Waiting for Kong to be ready..."
until curl -s "${KONG_ADMIN_URL}/status" > /dev/null 2>&1; do
  echo "Kong not ready yet, waiting..."
  sleep 2
done
echo "Kong is ready!"

# Function to create or update service
create_service() {
  local name=$1
  local url=$2
  echo "Creating/updating service: ${name} -> ${url}"
  
  # Check if service exists
  if curl -s "${KONG_ADMIN_URL}/services/${name}" | grep -q '"id"'; then
    # Update existing service
    curl -s -X PATCH "${KONG_ADMIN_URL}/services/${name}" \
      --data "url=${url}" > /dev/null
  else
    # Create new service
    curl -s -X POST "${KONG_ADMIN_URL}/services" \
      --data "name=${name}" \
      --data "url=${url}" > /dev/null
  fi
}

# Function to create or update route
create_route() {
  local service=$1
  local name=$2
  local path=$3
  echo "Creating/updating route: ${name} (${path}) -> ${service}"
  
  # Check if route exists
  if curl -s "${KONG_ADMIN_URL}/routes/${name}" | grep -q '"id"'; then
    # Update existing route
    curl -s -X PATCH "${KONG_ADMIN_URL}/routes/${name}" \
      --data "paths[]=${path}" \
      --data "strip_path=false" > /dev/null
  else
    # Create new route
    curl -s -X POST "${KONG_ADMIN_URL}/services/${service}/routes" \
      --data "name=${name}" \
      --data "paths[]=${path}" \
      --data "strip_path=false" > /dev/null
  fi
}

# Function to enable plugin globally or on service
enable_plugin() {
  local name=$1
  local config=$2
  local service=$3
  
  if [ -z "$service" ]; then
    echo "Enabling global plugin: ${name}"
    curl -s -X POST "${KONG_ADMIN_URL}/plugins" \
      --data "name=${name}" \
      ${config} > /dev/null 2>&1 || true
  else
    echo "Enabling plugin ${name} on service: ${service}"
    curl -s -X POST "${KONG_ADMIN_URL}/services/${service}/plugins" \
      --data "name=${name}" \
      ${config} > /dev/null 2>&1 || true
  fi
}

# ============================================
# Create Services
# ============================================
echo ""
echo "Creating services..."

create_service "auth-service" "http://auth-service:3000"
create_service "user-service" "http://user-service:3001"
create_service "product-service" "http://product-service:3002"
create_service "bidding-service" "http://bidding-service:3003"
create_service "recommendation-service" "http://recommendation-service:3004"

# ============================================
# Create Routes
# ============================================
echo ""
echo "Creating routes..."

# Auth Service Routes
create_route "auth-service" "auth-route" "/api/auth"

# User Service Routes
create_route "user-service" "user-route" "/api/users"

# Product Service Routes
create_route "product-service" "product-route" "/api/products"

# Bidding Service Routes
create_route "bidding-service" "bidding-route" "/api/bids"

# Recommendation Service Routes
create_route "recommendation-service" "recommendation-route" "/api/recommendations"

# Health check routes (direct access without /api prefix)
create_route "auth-service" "auth-health-route" "/auth/health"
create_route "user-service" "user-health-route" "/users/health"
create_route "product-service" "product-health-route" "/products/health"
create_route "bidding-service" "bidding-health-route" "/bids/health"
create_route "recommendation-service" "recommendation-health-route" "/recommendations/health"

# ============================================
# Configure Plugins
# ============================================
echo ""
echo "Configuring plugins..."

# Rate Limiting Plugin (100 requests per minute globally)
echo "Configuring rate limiting..."
enable_plugin "rate-limiting" "--data config.minute=100 --data config.policy=local"

# CORS Plugin (global)
echo "Configuring CORS..."
enable_plugin "cors" "--data config.origins=* --data config.methods=GET --data config.methods=POST --data config.methods=PUT --data config.methods=DELETE --data config.methods=OPTIONS --data config.methods=PATCH --data config.headers=Accept --data config.headers=Authorization --data config.headers=Content-Type --data config.exposed_headers=X-Auth-Token --data config.credentials=true --data config.max_age=3600"

# Request Transformer Plugin (add request ID)
echo "Configuring request transformer..."
enable_plugin "correlation-id" "--data config.header_name=X-Request-ID --data config.generator=uuid"

# Response Transformer Plugin (add security headers)
echo "Configuring response transformer..."
enable_plugin "response-transformer" "--data config.add.headers=X-Content-Type-Options:nosniff --data config.add.headers=X-Frame-Options:DENY"

echo ""
echo "============================================"
echo "Kong configuration completed!"
echo "============================================"
echo ""
echo "Services configured:"
echo "  - auth-service     -> http://auth-service:3000"
echo "  - user-service     -> http://user-service:3001"
echo "  - product-service  -> http://product-service:3002"
echo "  - bidding-service  -> http://bidding-service:3003"
echo "  - recommendation-service -> http://recommendation-service:3004"
echo ""
echo "Routes configured:"
echo "  - /api/auth/*           -> auth-service"
echo "  - /api/users/*          -> user-service"
echo "  - /api/products/*       -> product-service"
echo "  - /api/bids/*           -> bidding-service"
echo "  - /api/recommendations/* -> recommendation-service"
echo ""
echo "Plugins enabled:"
echo "  - rate-limiting (100 req/min)"
echo "  - cors (all origins)"
echo "  - correlation-id (X-Request-ID)"
echo "  - response-transformer (security headers)"
echo ""
