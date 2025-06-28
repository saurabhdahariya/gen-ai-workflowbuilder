#!/bin/bash

# Docker Build Script for GenAI Workflow Builder
# This script builds all Docker images for the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="genai-workflow-builder"
VERSION=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-}

echo -e "${BLUE}🐳 Building Docker Images for GenAI Workflow Builder${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY:-local}${NC}"
echo ""

# Function to build image
build_image() {
    local service=$1
    local context=$2
    local dockerfile=$3
    local tag_name="${PROJECT_NAME}-${service}:${VERSION}"
    
    if [ ! -z "$REGISTRY" ]; then
        tag_name="${REGISTRY}/${tag_name}"
    fi
    
    echo -e "${YELLOW}🔨 Building ${service} image...${NC}"
    echo -e "${BLUE}Context: ${context}${NC}"
    echo -e "${BLUE}Dockerfile: ${dockerfile}${NC}"
    echo -e "${BLUE}Tag: ${tag_name}${NC}"
    echo ""
    
    if docker build -t "$tag_name" -f "$dockerfile" "$context"; then
        echo -e "${GREEN}✅ Successfully built ${service} image${NC}"
        echo -e "${GREEN}   Tag: ${tag_name}${NC}"
        echo ""
    else
        echo -e "${RED}❌ Failed to build ${service} image${NC}"
        exit 1
    fi
}

# Build backend image
echo -e "${YELLOW}📦 Building Backend Service${NC}"
echo "================================"
build_image "backend" "./backend" "./backend/Dockerfile"

# Build frontend image
echo -e "${YELLOW}🎨 Building Frontend Service${NC}"
echo "================================="
build_image "frontend" "./frontend" "./frontend/Dockerfile"

# List built images
echo -e "${BLUE}📋 Built Images:${NC}"
echo "================"
docker images | grep "$PROJECT_NAME" | head -10

echo ""
echo -e "${GREEN}🎉 All images built successfully!${NC}"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "1. Test images locally:"
echo "   docker-compose up"
echo ""
echo "2. Run production stack:"
echo "   docker-compose -f docker-compose.prod.yml up"
echo ""
echo "3. Push to registry (if configured):"
echo "   docker-compose -f docker-compose.prod.yml push"
echo ""

# Optional: Push to registry
if [ ! -z "$REGISTRY" ] && [ "$2" = "--push" ]; then
    echo -e "${YELLOW}📤 Pushing images to registry...${NC}"
    docker push "${REGISTRY}/${PROJECT_NAME}-backend:${VERSION}"
    docker push "${REGISTRY}/${PROJECT_NAME}-frontend:${VERSION}"
    echo -e "${GREEN}✅ Images pushed to registry${NC}"
fi

echo -e "${GREEN}✨ Docker build completed successfully!${NC}"
