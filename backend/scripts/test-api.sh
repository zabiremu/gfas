#!/bin/bash
BASE="http://localhost:3001/api"

echo "=== Testing GFAS API ==="

echo ""
echo "1. Login as Admin..."
RESPONSE=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gtp.com","password":"Admin@123"}')
echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE

TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."

echo ""
echo "2. Get Dashboard Stats..."
curl -s -X GET $BASE/shipments/dashboard \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "3. Get All Shipments..."
curl -s -X GET $BASE/shipments \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null

echo ""
echo "=== Done ==="
