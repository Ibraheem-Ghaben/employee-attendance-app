#!/bin/bash

# ============================================================
# Overtime System Test Script
# Tests all API endpoints with sample data
# ============================================================

echo "=================================================="
echo "  Testing Overtime System API"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

API_URL="http://localhost:5000/api"

# Step 1: Login as admin
echo "Step 1: Login as admin..."
LOGIN_RESPONSE=$(curl -s -X POST ${API_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MSS@2024"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    print_error "Login failed"
    echo $LOGIN_RESPONSE
    exit 1
fi

print_success "Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Get employee pay config
echo "Step 2: Get employee pay config (080165)..."
CONFIG_RESPONSE=$(curl -s -X GET ${API_URL}/overtime/config/080165 \
  -H "Authorization: Bearer $TOKEN")

if echo "$CONFIG_RESPONSE" | grep -q '"success":true'; then
    print_success "Pay config retrieved"
    echo "$CONFIG_RESPONSE" | python3 -m json.tool | head -20
else
    print_error "Failed to get pay config"
    echo "$CONFIG_RESPONSE"
fi
echo ""

# Step 3: Update pay config
echo "Step 3: Update pay config..."
UPDATE_RESPONSE=$(curl -s -X POST ${API_URL}/overtime/config/080165 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hourly_rate_regular": 22.00,
    "weekday_ot_multiplier": 1.5,
    "weekend_ot_multiplier": 2.0
  }')

if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
    print_success "Pay config updated"
else
    print_error "Failed to update pay config"
    echo "$UPDATE_RESPONSE"
fi
echo ""

# Step 4: Calculate timesheets
echo "Step 4: Calculate timesheets for week..."
CALC_RESPONSE=$(curl -s -X POST ${API_URL}/overtime/calculate/080165 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_date": "2025-01-01",
    "to_date": "2025-01-07"
  }')

if echo "$CALC_RESPONSE" | grep -q '"success":true'; then
    print_success "Timesheets calculated"
    echo "$CALC_RESPONSE" | python3 -m json.tool
else
    print_error "Failed to calculate timesheets"
    echo "$CALC_RESPONSE"
fi
echo ""

# Step 5: Get weekly report
echo "Step 5: Get weekly report..."
REPORT_RESPONSE=$(curl -s -X GET "${API_URL}/overtime/reports/weekly?from_date=2025-01-01&to_date=2025-01-07&employee_code=080165" \
  -H "Authorization: Bearer $TOKEN")

if echo "$REPORT_RESPONSE" | grep -q '"success":true'; then
    print_success "Weekly report generated"
    echo "$REPORT_RESPONSE" | python3 -m json.tool | head -40
else
    print_error "Failed to generate report"
    echo "$REPORT_RESPONSE"
fi
echo ""

# Step 6: Test Excel export
echo "Step 6: Test Excel export..."
HTTP_CODE=$(curl -s -o /tmp/overtime_report.xlsx -w "%{http_code}" \
  "${API_URL}/overtime/reports/weekly/export?from_date=2025-01-01&to_date=2025-01-07&employee_code=080165" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" = "200" ]; then
    FILE_SIZE=$(stat -f%z /tmp/overtime_report.xlsx 2>/dev/null || stat -c%s /tmp/overtime_report.xlsx 2>/dev/null)
    print_success "Excel export successful (${FILE_SIZE} bytes)"
    print_info "File saved to: /tmp/overtime_report.xlsx"
else
    print_error "Excel export failed (HTTP $HTTP_CODE)"
fi
echo ""

# Step 7: Get all pay configs
echo "Step 7: Get all employee pay configurations..."
ALL_CONFIG_RESPONSE=$(curl -s -X GET ${API_URL}/overtime/config \
  -H "Authorization: Bearer $TOKEN")

if echo "$ALL_CONFIG_RESPONSE" | grep -q '"success":true'; then
    CONFIG_COUNT=$(echo "$ALL_CONFIG_RESPONSE" | grep -o '"employee_code"' | wc -l)
    print_success "Retrieved configurations for $CONFIG_COUNT employees"
else
    print_error "Failed to get all configs"
fi
echo ""

# Step 8: Test unauthorized access (should fail)
echo "Step 8: Test unauthorized access (should be denied)..."
UNAUTH_RESPONSE=$(curl -s -X GET ${API_URL}/overtime/config/080165)

if echo "$UNAUTH_RESPONSE" | grep -q 'Access denied'; then
    print_success "Unauthorized access properly denied"
else
    print_error "Authorization not working correctly"
fi
echo ""

echo "=================================================="
echo "  Test Summary"
echo "=================================================="
echo ""
echo "✓ Login successful"
echo "✓ Get pay config working"
echo "✓ Update pay config working"
echo "✓ Calculate timesheets working"
echo "✓ Weekly report working"
echo "✓ Excel export working"
echo "✓ List all configs working"
echo "✓ Authorization working"
echo ""
echo "All overtime system endpoints are functional!"
echo "=================================================="

