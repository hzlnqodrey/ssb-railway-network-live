#!/bin/bash
# Swiss Railway API - Newman Test Runner
# Usage: ./run-tests.sh [folder]
# Example: ./run-tests.sh Health

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECTION="$SCRIPT_DIR/Swiss-Railway-API.postman_collection.json"
ENVIRONMENT="$SCRIPT_DIR/Swiss-Railway-Local.postman_environment.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚂 Swiss Railway API - Test Runner${NC}"
echo "=================================="

# Check if newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}Error: Newman is not installed${NC}"
    echo "Install with: npm install -g newman"
    exit 1
fi

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend is not running on localhost:8080${NC}"
    echo "Start the backend with: cd backend-go && go run cmd/server/main.go"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"

# Run tests
if [ -n "$1" ]; then
    echo -e "${YELLOW}Running tests for folder: $1${NC}"
    newman run "$COLLECTION" \
        -e "$ENVIRONMENT" \
        --folder "$1" \
        --reporters cli \
        --color on
else
    echo -e "${YELLOW}Running all tests...${NC}"
    newman run "$COLLECTION" \
        -e "$ENVIRONMENT" \
        --reporters cli \
        --color on
fi

echo ""
echo -e "${GREEN}✓ Tests completed${NC}"
