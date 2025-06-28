#!/bin/bash

# Docker Health Check Script for GenAI Workflow Builder
# This script checks the health of all Docker services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE=${1:-docker-compose.yml}
MAX_WAIT_TIME=300  # 5 minutes
CHECK_INTERVAL=10  # 10 seconds

echo -e "${BLUE}🏥 Docker Health Check for GenAI Workflow Builder${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}Compose file: ${COMPOSE_FILE}${NC}"
echo ""

# Function to check service health
check_service_health() {
    local service=$1
    local container_name=$2
    local health_endpoint=$3
    
    echo -e "${YELLOW}🔍 Checking ${service} health...${NC}"
    
    # Check if container is running
    if ! docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
        echo -e "${RED}❌ Container ${container_name} is not running${NC}"
        return 1
    fi
    
    # Check container health status
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-health-check")
    
    if [ "$health_status" = "healthy" ]; then
        echo -e "${GREEN}✅ ${service} is healthy${NC}"
        return 0
    elif [ "$health_status" = "unhealthy" ]; then
        echo -e "${RED}❌ ${service} is unhealthy${NC}"
        return 1
    elif [ "$health_status" = "starting" ]; then
        echo -e "${YELLOW}⏳ ${service} is starting...${NC}"
        return 2
    else
        # No health check defined, try endpoint if provided
        if [ ! -z "$health_endpoint" ]; then
            if curl -f -s "$health_endpoint" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ ${service} endpoint is responding${NC}"
                return 0
            else
                echo -e "${RED}❌ ${service} endpoint is not responding${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  ${service} has no health check defined${NC}"
            return 0
        fi
    fi
}

# Function to wait for service
wait_for_service() {
    local service=$1
    local container_name=$2
    local health_endpoint=$3
    local waited=0
    
    echo -e "${YELLOW}⏳ Waiting for ${service} to be healthy...${NC}"
    
    while [ $waited -lt $MAX_WAIT_TIME ]; do
        check_service_health "$service" "$container_name" "$health_endpoint"
        local result=$?
        
        if [ $result -eq 0 ]; then
            echo -e "${GREEN}✅ ${service} is ready!${NC}"
            return 0
        elif [ $result -eq 1 ]; then
            echo -e "${RED}❌ ${service} failed health check${NC}"
            return 1
        fi
        
        # Service is starting, wait more
        sleep $CHECK_INTERVAL
        waited=$((waited + CHECK_INTERVAL))
        echo -e "${BLUE}   Waited ${waited}s/${MAX_WAIT_TIME}s...${NC}"
    done
    
    echo -e "${RED}❌ Timeout waiting for ${service} to be healthy${NC}"
    return 1
}

# Check if Docker Compose is running
if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo -e "${RED}❌ No services are running. Start with:${NC}"
    echo -e "${BLUE}   docker-compose -f ${COMPOSE_FILE} up -d${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Checking all services...${NC}"
echo ""

# Define services to check
declare -A services=(
    ["postgres"]="genai_postgres:http://localhost:5432"
    ["qdrant"]="genai_qdrant:http://localhost:6333/health"
    ["backend"]="genai_backend:http://localhost:8000/health"
    ["frontend"]="genai_frontend:http://localhost:3000"
)

# Check each service
all_healthy=true
for service in "${!services[@]}"; do
    IFS=':' read -r container_name health_endpoint <<< "${services[$service]}"
    
    if ! wait_for_service "$service" "$container_name" "$health_endpoint"; then
        all_healthy=false
    fi
    echo ""
done

# Summary
echo -e "${BLUE}📊 Health Check Summary${NC}"
echo "======================="

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Service URLs:${NC}"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo "   Qdrant: http://localhost:6333/dashboard"
    echo ""
    echo -e "${GREEN}✅ Your GenAI Workflow Builder is ready to use!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some services are not healthy${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
    echo "1. Check logs: docker-compose -f ${COMPOSE_FILE} logs [service]"
    echo "2. Restart services: docker-compose -f ${COMPOSE_FILE} restart"
    echo "3. Rebuild images: docker-compose -f ${COMPOSE_FILE} up --build"
    exit 1
fi
