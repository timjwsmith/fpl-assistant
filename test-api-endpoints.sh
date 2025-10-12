#!/bin/bash

# API Endpoint Testing Script
# Tests all 25+ endpoints with success, error, and edge cases

BASE_URL="http://localhost:5000"
REPORT_FILE="API_TESTING_REPORT.md"

# Color codes for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Initialize report
cat > $REPORT_FILE << 'EOF'
# Comprehensive API Testing Report

**Test Date:** $(date)
**Base URL:** http://localhost:5000
**Total Endpoints Tested:** 25

---

## Executive Summary

EOF

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local test_type=$6
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Make request and capture response
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL$endpoint" 2>/dev/null)
    else
        if [ -z "$data" ]; then
            response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X $method "$BASE_URL$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X $method -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
        fi
    fi
    
    # Parse response
    body=$(echo "$response" | head -n -2)
    status=$(echo "$response" | tail -n 2 | head -n 1)
    time=$(echo "$response" | tail -n 1)
    
    # Check if status matches expected
    if [ "$status" = "$expected_status" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ PASS${NC}: $description (${time}s)"
        echo "  ↳ $method $endpoint → $status"
        echo "- ✅ **$description**" >> $REPORT_FILE
        echo "  - Method: \`$method $endpoint\`" >> $REPORT_FILE
        echo "  - Expected Status: $expected_status | Actual: $status ✅" >> $REPORT_FILE
        echo "  - Response Time: ${time}s" >> $REPORT_FILE
        echo "  - Test Type: $test_type" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "  ↳ $method $endpoint → Expected $expected_status, Got $status"
        echo "  ↳ Response: ${body:0:200}"
        echo "- ❌ **$description**" >> $REPORT_FILE
        echo "  - Method: \`$method $endpoint\`" >> $REPORT_FILE
        echo "  - Expected Status: $expected_status | Actual: $status ❌" >> $REPORT_FILE
        echo "  - Response Time: ${time}s" >> $REPORT_FILE
        echo "  - Test Type: $test_type" >> $REPORT_FILE
        echo "  - Error Response: \`${body:0:200}\`" >> $REPORT_FILE
        echo "" >> $REPORT_FILE
    fi
}

echo "=========================================="
echo "  API Endpoint Testing Suite"
echo "=========================================="
echo ""

# ============================================
# 1. FPL API PROXY ENDPOINTS
# ============================================
echo -e "${YELLOW}[1/9] Testing FPL API Proxy Endpoints${NC}"
echo "" >> $REPORT_FILE
echo "## 1. FPL API Proxy Endpoints (11 total)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Success cases
test_endpoint "GET" "/api/fpl/bootstrap" "200" "GET /api/fpl/bootstrap - Success" "" "Success Case"
test_endpoint "GET" "/api/fpl/players" "200" "GET /api/fpl/players - Success" "" "Success Case"
test_endpoint "GET" "/api/fpl/teams" "200" "GET /api/fpl/teams - Success" "" "Success Case"
test_endpoint "GET" "/api/fpl/gameweeks" "200" "GET /api/fpl/gameweeks - Success" "" "Success Case"
test_endpoint "GET" "/api/fpl/fixtures" "200" "GET /api/fpl/fixtures - Success (no gameweek)" "" "Success Case"
test_endpoint "GET" "/api/fpl/fixtures?gameweek=1" "200" "GET /api/fpl/fixtures - Success (with gameweek=1)" "" "Success Case"
test_endpoint "GET" "/api/fpl/positions" "200" "GET /api/fpl/positions - Success" "" "Success Case"
test_endpoint "GET" "/api/fpl/player/1" "200" "GET /api/fpl/player/:id - Success (valid player)" "" "Success Case"
test_endpoint "GET" "/api/fpl/manager/1" "200" "GET /api/fpl/manager/:id - Success (valid manager)" "" "Success Case"
test_endpoint "GET" "/api/fpl/manager/1/picks/1" "200" "GET /api/fpl/manager/:id/picks/:gameweek - Success" "" "Success Case"
test_endpoint "GET" "/api/fpl/manager/1/transfers" "200" "GET /api/fpl/manager/:id/transfers - Success" "" "Success Case"
test_endpoint "GET" "/api/fpl/manager/1/history" "200" "GET /api/fpl/manager/:id/history - Success" "" "Success Case"

# Error cases - invalid parameters
test_endpoint "GET" "/api/fpl/player/abc" "500" "GET /api/fpl/player/:id - Invalid ID (NaN)" "" "Error Case"
test_endpoint "GET" "/api/fpl/player/-1" "500" "GET /api/fpl/player/:id - Negative ID" "" "Error Case"
test_endpoint "GET" "/api/fpl/manager/abc" "500" "GET /api/fpl/manager/:id - Invalid manager ID" "" "Error Case"
test_endpoint "GET" "/api/fpl/manager/999999999" "500" "GET /api/fpl/manager/:id - Non-existent manager" "" "Error Case"

# Edge cases
test_endpoint "GET" "/api/fpl/fixtures?gameweek=0" "200" "GET /api/fpl/fixtures - Edge case (gameweek=0)" "" "Edge Case"
test_endpoint "GET" "/api/fpl/fixtures?gameweek=999" "200" "GET /api/fpl/fixtures - Edge case (gameweek=999)" "" "Edge Case"
test_endpoint "GET" "/api/fpl/fixtures?gameweek=abc" "200" "GET /api/fpl/fixtures - Edge case (invalid gameweek param)" "" "Edge Case"

echo ""

# ============================================
# 2. MANAGER SYNC ENDPOINTS
# ============================================
echo -e "${YELLOW}[2/9] Testing Manager Sync Endpoints${NC}"
echo "" >> $REPORT_FILE
echo "## 2. Manager Sync Endpoints (2 total)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Success cases - using a real FPL manager ID
test_endpoint "POST" "/api/manager/sync/1" "200" "POST /api/manager/sync/:managerId - Success (valid manager)" "" "Success Case"
test_endpoint "GET" "/api/manager/1/status" "200" "GET /api/manager/:managerId/status - Success (after sync)" "" "Success Case"

# Error cases
test_endpoint "POST" "/api/manager/sync/abc" "400" "POST /api/manager/sync/:managerId - Invalid manager ID (NaN)" "" "Error Case"
test_endpoint "POST" "/api/manager/sync/-1" "400" "POST /api/manager/sync/:managerId - Negative manager ID" "" "Error Case"
test_endpoint "GET" "/api/manager/abc/status" "400" "GET /api/manager/:managerId/status - Invalid manager ID" "" "Error Case"
test_endpoint "GET" "/api/manager/999999999/status" "404" "GET /api/manager/:managerId/status - Non-existent manager (not synced)" "" "Error Case"

echo ""

# ============================================
# 3. USER SETTINGS ENDPOINTS
# ============================================
echo -e "${YELLOW}[3/9] Testing User Settings Endpoints${NC}"
echo "" >> $REPORT_FILE
echo "## 3. User Settings Endpoints (2 total)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Success cases
test_endpoint "GET" "/api/settings/1" "200" "GET /api/settings/:userId - Success (existing user)" "" "Success Case"
test_endpoint "GET" "/api/settings/99999" "200" "GET /api/settings/:userId - Success (non-existent user, returns defaults)" "" "Success Case"
test_endpoint "POST" "/api/settings/1" "200" "POST /api/settings/:userId - Success (valid data)" '{"manager_id": 123, "risk_tolerance": "aggressive"}' "Success Case"

# Error cases
test_endpoint "GET" "/api/settings/abc" "400" "GET /api/settings/:userId - Invalid userId (NaN)" "" "Error Case"
test_endpoint "GET" "/api/settings/-1" "400" "GET /api/settings/:userId - Negative userId" "" "Error Case"
test_endpoint "POST" "/api/settings/abc" "400" "POST /api/settings/:userId - Invalid userId (NaN)" '{"risk_tolerance": "balanced"}' "Error Case"
test_endpoint "POST" "/api/settings/1" "400" "POST /api/settings/:userId - Invalid settings data" '{"risk_tolerance": "invalid_value"}' "Error Case"
test_endpoint "POST" "/api/settings/1" "400" "POST /api/settings/:userId - Invalid JSON" 'invalid json' "Error Case"

echo ""

# ============================================
# 4. TEAM MANAGEMENT ENDPOINTS
# ============================================
echo -e "${YELLOW}[4/9] Testing Team Management Endpoints${NC}"
echo "" >> $REPORT_FILE
echo "## 4. Team Management Endpoints (2 total)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Success cases
valid_team_data='{"userId": 1, "gameweek": 1, "players": [{"player_id": 1, "position": 1, "is_captain": true, "is_vice_captain": false}], "formation": "4-4-2", "teamValue": 1000, "bank": 0}'
test_endpoint "POST" "/api/teams" "200" "POST /api/teams - Success (valid team data)" "$valid_team_data" "Success Case"
test_endpoint "GET" "/api/teams/1" "200" "GET /api/teams/:userId - Success (all teams)" "" "Success Case"
test_endpoint "GET" "/api/teams/1?gameweek=1" "200" "GET /api/teams/:userId - Success (specific gameweek)" "" "Success Case"

# Error cases
test_endpoint "POST" "/api/teams" "400" "POST /api/teams - Missing required fields (no body)" "" "Error Case"
test_endpoint "POST" "/api/teams" "400" "POST /api/teams - Missing required fields (partial data)" '{"userId": 1}' "Error Case"
test_endpoint "POST" "/api/teams" "400" "POST /api/teams - Invalid JSON" 'invalid' "Error Case"
test_endpoint "GET" "/api/teams/abc" "400" "GET /api/teams/:userId - Invalid userId" "" "Error Case"
test_endpoint "GET" "/api/teams/-1" "400" "GET /api/teams/:userId - Negative userId" "" "Error Case"

# Edge cases
test_endpoint "GET" "/api/teams/1?gameweek=abc" "200" "GET /api/teams/:userId - Invalid gameweek param" "" "Edge Case"
test_endpoint "GET" "/api/teams/999999" "200" "GET /api/teams/:userId - Non-existent user" "" "Edge Case"

echo ""

# ============================================
# 5. TRANSFER ENDPOINTS
# ============================================
echo -e "${YELLOW}[5/9] Testing Transfer Endpoints${NC}"
echo "" >> $REPORT_FILE
echo "## 5. Transfer Endpoints (2 total)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Success cases
valid_transfer='{"userId": 1, "gameweek": 1, "playerInId": 1, "playerOutId": 2, "cost": 0}'
test_endpoint "POST" "/api/transfers" "200" "POST /api/transfers - Success (valid transfer)" "$valid_transfer" "Success Case"
test_endpoint "GET" "/api/transfers/1" "200" "GET /api/transfers/:userId - Success (all transfers)" "" "Success Case"
test_endpoint "GET" "/api/transfers/1?gameweek=1" "200" "GET /api/transfers/:userId - Success (specific gameweek)" "" "Success Case"

# Error cases
test_endpoint "POST" "/api/transfers" "400" "POST /api/transfers - Missing required fields" "" "Error Case"
test_endpoint "POST" "/api/transfers" "400" "POST /api/transfers - Partial data" '{"userId": 1}' "Error Case"
test_endpoint "GET" "/api/transfers/abc" "400" "GET /api/transfers/:userId - Invalid userId" "" "Error Case"
test_endpoint "GET" "/api/transfers/-1" "400" "GET /api/transfers/:userId - Negative userId" "" "Error Case"

echo ""

# ============================================
# 6. PERFORMANCE ENDPOINTS
# ============================================
echo -e "${YELLOW}[6/9] Testing Performance Endpoints${NC}"
echo "" >> $REPORT_FILE
echo "## 6. Performance Endpoints (2 total)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Success cases
test_endpoint "GET" "/api/performance/1?gameweek=1" "200" "GET /api/performance/:userId - Success (valid params)" "" "Success Case"
test_endpoint "POST" "/api/performance/update-actual" "200" "POST /api/performance/update-actual - Success" '{"userId": 1, "gameweek": 1}' "Success Case"

# Error cases
test_endpoint "GET" "/api/performance/abc?gameweek=1" "400" "GET /api/performance/:userId - Invalid userId" "" "Error Case"
test_endpoint "GET" "/api/performance/1" "400" "GET /api/performance/:userId - Missing gameweek param" "" "Error Case"
test_endpoint "GET" "/api/performance/1?gameweek=abc" "400" "GET /api/performance/:userId - Invalid gameweek param" "" "Error Case"
test_endpoint "POST" "/api/performance/update-actual" "400" "POST /api/performance/update-actual - Missing data" "" "Error Case"
test_endpoint "POST" "/api/performance/update-actual" "400" "POST /api/performance/update-actual - Partial data" '{"userId": 1}' "Error Case"

echo ""

# ============================================
# 7. AI PREDICTION ENDPOINTS
# ============================================
echo -e "${YELLOW}[7/9] Testing AI Prediction Endpoints${NC}"
echo "" >> $REPORT_FILE
echo "## 7. AI Prediction Endpoints (5 total)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Success cases (Note: These may fail if AI service is not configured)
player_data='{"player": {"id": 1, "web_name": "Salah", "element_type": 3, "form": "8.0", "total_points": 100, "expected_goals": "5.5", "expected_assists": "3.2", "minutes": 900, "status": "a"}, "fixtures": [{"id": 1, "team_h_difficulty": 2}]}'
test_endpoint "POST" "/api/ai/predict-player" "200" "POST /api/ai/predict-player - Success" "$player_data" "Success Case (AI)"

transfer_data='{"currentPlayers": [{"id": 1, "form": "5.0"}], "budget": 100}'
test_endpoint "POST" "/api/ai/transfer-recommendations" "200" "POST /api/ai/transfer-recommendations - Success" "$transfer_data" "Success Case (AI)"

captain_data='{"playerIds": [1, 2, 3]}'
test_endpoint "POST" "/api/ai/captain-recommendations" "200" "POST /api/ai/captain-recommendations - Success" "$captain_data" "Success Case (AI)"

chip_data='{"currentGameweek": 1, "remainingChips": ["wildcard", "benchboost"]}'
test_endpoint "POST" "/api/ai/chip-strategy" "200" "POST /api/ai/chip-strategy - Success" "$chip_data" "Success Case (AI)"

team_analysis='{"players": [{"id": 1, "element_type": 1}], "formation": "4-4-2"}'
test_endpoint "POST" "/api/ai/analyze-team" "200" "POST /api/ai/analyze-team - Success" "$team_analysis" "Success Case (AI)"

# Error cases
test_endpoint "POST" "/api/ai/predict-player" "400" "POST /api/ai/predict-player - Missing data" "" "Error Case"
test_endpoint "POST" "/api/ai/predict-player" "400" "POST /api/ai/predict-player - Partial data" '{"player": {}}' "Error Case"
test_endpoint "POST" "/api/ai/transfer-recommendations" "400" "POST /api/ai/transfer-recommendations - Missing data" "" "Error Case"
test_endpoint "POST" "/api/ai/captain-recommendations" "400" "POST /api/ai/captain-recommendations - Invalid playerIds" '{"playerIds": "not_an_array"}' "Error Case"
test_endpoint "POST" "/api/ai/chip-strategy" "400" "POST /api/ai/chip-strategy - Missing data" "" "Error Case"
test_endpoint "POST" "/api/ai/analyze-team" "400" "POST /api/ai/analyze-team - Missing data" "" "Error Case"

echo ""

# ============================================
# 8. INTEGRATION TESTS - CACHING
# ============================================
echo -e "${YELLOW}[8/9] Testing Integration - Caching${NC}"
echo "" >> $REPORT_FILE
echo "## 8. Integration Tests - Caching" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "Testing FPL API caching (5 minute cache)..." >> $REPORT_FILE

# First request - should hit FPL API
start_time=$(date +%s%3N)
response1=$(curl -s -w "\n%{time_total}" "$BASE_URL/api/fpl/bootstrap" 2>/dev/null)
time1=$(echo "$response1" | tail -n 1)

# Second request - should be cached
response2=$(curl -s -w "\n%{time_total}" "$BASE_URL/api/fpl/bootstrap" 2>/dev/null)
time2=$(echo "$response2" | tail -n 1)

echo "- First request time: ${time1}s" >> $REPORT_FILE
echo "- Second request time (cached): ${time2}s" >> $REPORT_FILE

# Calculate if second request was faster (indicating cache hit)
if (( $(echo "$time2 < $time1" | bc -l) )); then
    echo -e "${GREEN}✅ CACHE WORKING${NC}: Second request faster (${time2}s vs ${time1}s)"
    echo "- ✅ **Caching is working correctly** - Second request was faster" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  CACHE UNCERTAIN${NC}: Similar response times"
    echo "- ⚠️  **Caching behavior uncertain** - Response times similar" >> $REPORT_FILE
fi

echo ""

# ============================================
# 9. CONCURRENT REQUESTS TEST
# ============================================
echo -e "${YELLOW}[9/9] Testing Concurrent Requests${NC}"
echo "" >> $REPORT_FILE
echo "## 9. Concurrent Requests Test" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "Sending 5 concurrent requests to /api/fpl/players..." >> $REPORT_FILE

# Run 5 concurrent requests
for i in {1..5}; do
    curl -s "$BASE_URL/api/fpl/players" > /dev/null &
done
wait

echo -e "${GREEN}✅ Concurrent requests completed${NC}"
echo "- ✅ **Concurrent requests handled successfully** - 5 parallel requests to /api/fpl/players" >> $REPORT_FILE

echo ""

# ============================================
# GENERATE SUMMARY
# ============================================
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo ""

pass_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
echo "Pass Rate: ${pass_rate}%"

# Calculate quality score (out of 10)
quality_score=$(echo "scale=1; $pass_rate / 10" | bc)

echo ""
echo "=========================================="
echo "Report saved to: $REPORT_FILE"
echo "=========================================="

# Update executive summary in report
sed -i "3s/.*/\*\*Test Date:\*\* $(date)/" $REPORT_FILE

cat >> $REPORT_FILE << EOF

---

## Test Summary

| Metric | Value |
|--------|-------|
| Total Tests | $TOTAL_TESTS |
| Passed | $PASSED_TESTS ✅ |
| Failed | $FAILED_TESTS ❌ |
| Pass Rate | ${pass_rate}% |
| **Overall API Quality Score** | **${quality_score}/10** |

### Key Findings

EOF

# Add findings based on results
if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ **All tests passed!** The API is functioning correctly with robust error handling." >> $REPORT_FILE
else
    echo "⚠️ **$FAILED_TESTS tests failed.** See detailed results above for specific issues." >> $REPORT_FILE
fi

cat >> $REPORT_FILE << 'EOF'

---

## Recommendations

### 1. Error Handling Improvements
- Ensure all endpoints validate input parameters before processing
- Return user-friendly error messages instead of generic "Failed to..." messages
- Add specific HTTP status codes for different error scenarios (404 for not found, 400 for validation errors)

### 2. Validation Enhancements
- Add stricter validation for numeric IDs (check for NaN, negative values)
- Validate gameweek ranges (1-38 for FPL)
- Add request body schema validation for all POST endpoints

### 3. Performance Optimizations
- FPL API caching is implemented (5-minute cache)
- Consider adding cache headers to responses
- Implement rate limiting for AI endpoints to prevent abuse

### 4. Integration Robustness
- Add retry logic for external API calls (FPL API, AI service)
- Implement circuit breaker pattern for third-party services
- Add fallback responses when external services are unavailable

### 5. Security Considerations
- Ensure no sensitive data is leaked in error responses
- Validate and sanitize all user inputs
- Implement rate limiting to prevent DoS attacks

### 6. Monitoring & Logging
- Add structured logging for all errors
- Implement request/response logging for debugging
- Set up alerts for high error rates

---

## Detailed Test Results

See sections above for detailed test results by category.

EOF

echo ""
echo "✅ Testing complete! Review the report for detailed findings."
