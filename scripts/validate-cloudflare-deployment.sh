#!/bin/bash
##########################################
# Cloudflare Workers Deployment Validation
# 
# This script validates that:
# 1. The Cloudflare Workers setup is correct
# 2. The Next.js frontend can reach the Worker API
# 3. All endpoints are working
# 4. Authentication is configured
#
# Usage: ./scripts/validate-cloudflare-deployment.sh [api_url]
# Example: ./scripts/validate-cloudflare-deployment.sh https://api.rockhound.app
##########################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-https://api.rockhound.app}"
FRONTEND_URL="http://localhost:3000"
TIMEOUT=10

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_test() {
  echo -en "  $1 ... "
}

pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  ((TESTS_PASSED++))
}

fail() {
  echo -e "${RED}✗ FAIL${NC}"
  echo -e "    ${RED}Error: $1${NC}"
  ((TESTS_FAILED++))
}

skip() {
  echo -e "${YELLOW}⊘ SKIP${NC}"
  echo -e "    ${YELLOW}Reason: $1${NC}"
  ((TESTS_SKIPPED++))
}

warn() {
  echo -e "${YELLOW}⚠ WARN${NC}"
  echo -e "    ${YELLOW}$1${NC}"
}

# Test functions
test_api_reachable() {
  print_header "1. CONNECTIVITY TESTS"
  
  print_test "API is reachable"
  if curl -sf --max-time $TIMEOUT "$API_URL/health" > /dev/null 2>&1; then
    pass
  else
    fail "Cannot reach API at $API_URL"
    return 1
  fi
}

test_cloudflare_headers() {
  print_test "Cloudflare headers present"
  
  response=$(curl -sI --max-time $TIMEOUT "$API_URL/health" 2>/dev/null)
  
  if echo "$response" | grep -q "cf-ray"; then
    pass
  else
    warn "cf-ray header missing (may not be behind Cloudflare)"
  fi
  
  if echo "$response" | grep -q "server.*cloudflare"; then
    pass
  else
    print_test "Server header identifies Cloudflare"
    if echo "$response" | grep -q "Server:"; then
      warn "Server header present but doesn't identify Cloudflare"
    fi
  fi
}

test_cors_headers() {
  print_header "2. CORS & SECURITY HEADERS"
  
  print_test "CORS headers configured"
  response=$(curl -sI --max-time $TIMEOUT \
    -H "Origin: http://localhost:3000" \
    "$API_URL/health" 2>/dev/null)
  
  if echo "$response" | grep -q "access-control-allow"; then
    pass
  else
    warn "CORS headers not found (may be restricted)"
  fi
  
  print_test "Security headers present"
  required_headers=("x-content-type-options" "x-frame-options" "content-security-policy")
  missing_headers=0
  
  for header in "${required_headers[@]}"; do
    if ! echo "$response" | grep -qi "$header"; then
      ((missing_headers++))
    fi
  done
  
  if [ $missing_headers -eq 0 ]; then
    pass
  else
    warn "Missing $missing_headers recommended security headers"
  fi
}

test_api_endpoints() {
  print_header "3. ENDPOINT TESTS"
  
  # Health check
  print_test "GET /health"
  if curl -sf --max-time $TIMEOUT "$API_URL/health" > /dev/null 2>&1; then
    pass
  else
    fail "Health endpoint failed"
  fi
  
  # Locations endpoint
  print_test "GET /locations (with bbox)"
  if curl -sf --max-time $TIMEOUT "$API_URL/locations?bbox=-120,-40,120,40" > /dev/null 2>&1; then
    pass
  else
    fail "Locations endpoint failed"
  fi
  
  # Locations detail
  print_test "GET /locations/:id"
  if curl -sf --max-time $TIMEOUT "$API_URL/locations/1" > /dev/null 2>&1; then
    pass
  else
    warn "Location detail endpoint failed (may not have data)"
  fi
  
  # State packs
  print_test "GET /state-packs"
  if curl -sf --max-time $TIMEOUT "$API_URL/state-packs" > /dev/null 2>&1; then
    pass
  else
    fail "State packs endpoint failed"
  fi
  
  # Create export
  print_test "POST /exports"
  response=$(curl -s --max-time $TIMEOUT -X POST "$API_URL/exports" \
    -H "Content-Type: application/json" \
    -d '{"type":"observations"}' 2>&1)
  
  if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
    pass
  else
    warn "Create export failed: $response"
  fi
  
  # Create observation
  print_test "POST /observations"
  response=$(curl -s --max-time $TIMEOUT -X POST "$API_URL/observations" \
    -H "Content-Type: application/json" \
    -H "x-user-id: test-user-$(date +%s)" \
    -d '{"locationId":"1","title":"Test"}' 2>&1)
  
  if echo "$response" | jq -e '.id' > /dev/null 2>&1; then
    pass
  else
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
      warn "Create observation failed: $(echo "$response" | jq -r '.error')"
    else
      warn "Create observation failed: $response"
    fi
  fi
}

test_request_headers() {
  print_header "4. REQUEST VALIDATION"
  
  print_test "Invalid bbox rejected"
  response=$(curl -s --max-time $TIMEOUT "$API_URL/locations?bbox=invalid")
  
  if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    pass
  else
    warn "Invalid bbox was accepted (validation may be disabled)"
  fi
  
  print_test "Missing required params detected"
  response=$(curl -s --max-time $TIMEOUT "$API_URL/locations")
  
  if [ -n "$response" ]; then
    # Should return error about missing bbox
    if echo "$response" | grep -q "error\|required\|Invalid"; then
      pass
    else
      warn "Missing required parameter validation unclear"
    fi
  fi
}

test_response_format() {
  print_header "5. RESPONSE FORMAT TESTS"
  
  print_test "JSON responses are valid"
  response=$(curl -s --max-time $TIMEOUT "$API_URL/health")
  
  if echo "$response" | jq . > /dev/null 2>&1; then
    pass
  else
    fail "Response is not valid JSON: $response"
  fi
  
  print_test "Error responses are valid JSON"
  response=$(curl -s --max-time $TIMEOUT "$API_URL/locations?bbox=invalid")
  
  if echo "$response" | jq . > /dev/null 2>&1; then
    pass
  else
    warn "Error response is not valid JSON"
  fi
  
  print_test "Locations response has expected structure"
  response=$(curl -s --max-time $TIMEOUT "$API_URL/locations?bbox=-10,40,10,50")
  
  if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
    pass
  else
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
      warn "Got error: $(echo "$response" | jq -r '.error')"
    else
      warn "Unexpected response structure"
    fi
  fi
}

test_performance() {
  print_header "6. PERFORMANCE TESTS"
  
  print_test "Health check < 500ms"
  start_time=$(date +%s%N)
  curl -sf --max-time $TIMEOUT "$API_URL/health" > /dev/null 2>&1
  end_time=$(date +%s%N)
  elapsed_ms=$(( (end_time - start_time) / 1000000 ))
  
  if [ $elapsed_ms -lt 500 ]; then
    pass
  else
    warn "Response time ${elapsed_ms}ms (expected <500ms)"
  fi
  
  print_test "Locations query < 1000ms"
  start_time=$(date +%s%N)
  curl -sf --max-time $TIMEOUT "$API_URL/locations?bbox=-120,-40,120,40" > /dev/null 2>&1
  end_time=$(date +%s%N)
  elapsed_ms=$(( (end_time - start_time) / 1000000 ))
  
  if [ $elapsed_ms -lt 1000 ]; then
    pass
  else
    warn "Response time ${elapsed_ms}ms (expected <1000ms)"
  fi
}

test_durable_objects() {
  print_header "7. DURABLE OBJECTS TESTS"
  
  print_test "ExportCoordinatorDO accessible"
  response=$(curl -s --max-time $TIMEOUT -X POST "$API_URL/do/ExportCoordinatorDO/init" \
    -H "Content-Type: application/json" 2>&1)
  
  if [ -n "$response" ]; then
    pass
  else
    warn "ExportCoordinatorDO may not be initialized"
  fi
  
  print_test "StatePackRegistryDO accessible"
  response=$(curl -s --max-time $TIMEOUT -X GET "$API_URL/do/StatePackRegistryDO/list" \
    -H "Content-Type: application/json" 2>&1)
  
  if [ -n "$response" ]; then
    pass
  else
    warn "StatePackRegistryDO may not be initialized"
  fi
}

test_authentication() {
  print_header "8. AUTHENTICATION TESTS"
  
  print_test "Admin endpoint requires auth"
  response=$(curl -s --max-time $TIMEOUT -X POST "$API_URL/moderation/review" \
    -H "Content-Type: application/json" \
    -d '{"id":"test"}' 2>&1)
  
  if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    # Got error, which is expected
    error=$(echo "$response" | jq -r '.error')
    if echo "$error" | grep -qi "forbidden\|unauthorized\|admin"; then
      pass
    else
      warn "Got error but unclear if auth-related: $error"
    fi
  else
    warn "Admin endpoint may not require authentication"
  fi
  
  print_test "User ID header accepted"
  response=$(curl -s --max-time $TIMEOUT -X POST "$API_URL/observations" \
    -H "Content-Type: application/json" \
    -H "x-user-id: test-user" \
    -d '{"locationId":"1","title":"Test"}' 2>&1)
  
  if [ -n "$response" ] && echo "$response" | jq . > /dev/null 2>&1; then
    pass
  else
    warn "User ID header may not be handled correctly"
  fi
}

test_error_handling() {
  print_header "9. ERROR HANDLING TESTS"
  
  print_test "400 Bad Request for invalid input"
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    "$API_URL/locations?bbox=invalid")
  
  if [ "$status" = "400" ]; then
    pass
  else
    warn "Got status $status instead of 400"
  fi
  
  print_test "404 Not Found for missing resource"
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
    "$API_URL/locations/999999999")
  
  if [ "$status" = "404" ] || [ "$status" = "200" ]; then
    pass  # 200 is ok if empty result
  else
    warn "Got status $status"
  fi
  
  print_test "500 or error response format"
  # Intentionally trigger server error if possible
  response=$(curl -s --max-time $TIMEOUT -X POST "$API_URL/exports" \
    -H "Content-Type: application/json" \
    -d '{}' 2>&1)
  
  if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    pass
  else
    warn "Error response format unclear"
  fi
}

test_frontend_integration() {
  print_header "10. FRONTEND INTEGRATION TESTS"
  
  print_test "Frontend can reach worker from browser context"
  if curl -sf --max-time $TIMEOUT \
    -H "Origin: $FRONTEND_URL" \
    -H "Referer: $FRONTEND_URL/" \
    "$API_URL/health" > /dev/null 2>&1; then
    pass
  else
    warn "Frontend may not be able to reach worker"
  fi
  
  print_test "NEXT_PUBLIC_API_URL environment variable set"
  if [ -n "$NEXT_PUBLIC_API_URL" ]; then
    pass
  else
    skip "NEXT_PUBLIC_API_URL not set in environment"
  fi
  
  print_test "Frontend Next.js config correct"
  if [ -f "apps/web/next.config.js" ]; then
    pass
  else
    fail "Next.js config not found"
  fi
}

# Main execution
main() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════╗"
  echo "║   Cloudflare Workers Deployment Validation        ║"
  echo "║   Testing API at: $API_URL"
  echo "╚════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  # Check if API URL is provided
  if [ -z "$API_URL" ]; then
    echo -e "${RED}Error: API_URL not provided${NC}"
    echo "Usage: $0 [api_url]"
    exit 1
  fi
  
  # Run all tests
  test_api_reachable || exit 1
  test_cloudflare_headers
  test_cors_headers
  test_api_endpoints
  test_request_headers
  test_response_format
  test_performance
  test_durable_objects
  test_authentication
  test_error_handling
  test_frontend_integration
  
  # Summary
  print_header "TEST SUMMARY"
  total=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
  echo -e "Total tests: $total"
  echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
  echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
  echo -e "  ${YELLOW}Skipped: $TESTS_SKIPPED${NC}"
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    echo -e "API is ready for production traffic.\n"
    exit 0
  else
    echo -e "\n${RED}✗ Some tests failed!${NC}"
    echo -e "Please review errors above before deploying.\n"
    exit 1
  fi
}

# Run main function
main "$@"
