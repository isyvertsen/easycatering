#!/bin/bash

# Development startup script using uv

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting backend with uv...${NC}"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv is not installed. Please install it first:"
    echo "curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo -e "${GREEN}Creating virtual environment...${NC}"
    uv venv
fi

# Install/update dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
uv pip sync requirements.lock

# Run the application
echo -e "${GREEN}Starting FastAPI server...${NC}"
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload