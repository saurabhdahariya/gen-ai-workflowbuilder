#!/bin/bash

# Docker Cleanup Script for GenAI Workflow Builder
# This script helps clean up Docker resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_NAME="genai-workflow-builder"

echo -e "${BLUE}🧹 Docker Cleanup for GenAI Workflow Builder${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Function to show disk usage
show_disk_usage() {
    echo -e "${BLUE}💾 Current Docker Disk Usage:${NC}"
    docker system df
    echo ""
}

# Function to clean containers
clean_containers() {
    echo -e "${YELLOW}🗑️  Cleaning stopped containers...${NC}"
    
    local stopped_containers=$(docker ps -a -q --filter "status=exited")
    if [ ! -z "$stopped_containers" ]; then
        docker rm $stopped_containers
        echo -e "${GREEN}✅ Removed stopped containers${NC}"
    else
        echo -e "${BLUE}ℹ️  No stopped containers to remove${NC}"
    fi
    echo ""
}

# Function to clean images
clean_images() {
    echo -e "${YELLOW}🖼️  Cleaning unused images...${NC}"
    
    # Remove dangling images
    local dangling_images=$(docker images -f "dangling=true" -q)
    if [ ! -z "$dangling_images" ]; then
        docker rmi $dangling_images
        echo -e "${GREEN}✅ Removed dangling images${NC}"
    else
        echo -e "${BLUE}ℹ️  No dangling images to remove${NC}"
    fi
    
    # Remove unused images
    docker image prune -f
    echo -e "${GREEN}✅ Cleaned unused images${NC}"
    echo ""
}

# Function to clean volumes
clean_volumes() {
    echo -e "${YELLOW}📦 Cleaning unused volumes...${NC}"
    
    local unused_volumes=$(docker volume ls -f "dangling=true" -q)
    if [ ! -z "$unused_volumes" ]; then
        docker volume rm $unused_volumes
        echo -e "${GREEN}✅ Removed unused volumes${NC}"
    else
        echo -e "${BLUE}ℹ️  No unused volumes to remove${NC}"
    fi
    echo ""
}

# Function to clean networks
clean_networks() {
    echo -e "${YELLOW}🌐 Cleaning unused networks...${NC}"
    
    docker network prune -f
    echo -e "${GREEN}✅ Cleaned unused networks${NC}"
    echo ""
}

# Function to clean build cache
clean_build_cache() {
    echo -e "${YELLOW}🔨 Cleaning build cache...${NC}"
    
    docker builder prune -f
    echo -e "${GREEN}✅ Cleaned build cache${NC}"
    echo ""
}

# Function to stop and remove project containers
stop_project_containers() {
    echo -e "${YELLOW}🛑 Stopping project containers...${NC}"
    
    # Stop containers using docker-compose
    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        echo -e "${GREEN}✅ Stopped development containers${NC}"
    fi
    
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml down
        echo -e "${GREEN}✅ Stopped production containers${NC}"
    fi
    
    # Remove any remaining project containers
    local project_containers=$(docker ps -a --filter "name=genai" -q)
    if [ ! -z "$project_containers" ]; then
        docker rm -f $project_containers
        echo -e "${GREEN}✅ Removed project containers${NC}"
    fi
    echo ""
}

# Function to remove project images
remove_project_images() {
    echo -e "${YELLOW}🗑️  Removing project images...${NC}"
    
    local project_images=$(docker images --filter "reference=*$PROJECT_NAME*" -q)
    if [ ! -z "$project_images" ]; then
        docker rmi -f $project_images
        echo -e "${GREEN}✅ Removed project images${NC}"
    else
        echo -e "${BLUE}ℹ️  No project images to remove${NC}"
    fi
    echo ""
}

# Function to remove project volumes
remove_project_volumes() {
    echo -e "${YELLOW}📦 Removing project volumes...${NC}"
    
    # Remove named volumes
    local volumes_to_remove=(
        "genai_postgres_data"
        "genai_qdrant_storage"
        "genai_backend_uploads"
        "genai_backend_logs"
        "genai_backend_chroma"
        "genai_redis_data"
    )
    
    for volume in "${volumes_to_remove[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            docker volume rm "$volume" 2>/dev/null || true
            echo -e "${GREEN}✅ Removed volume: $volume${NC}"
        fi
    done
    echo ""
}

# Main menu
show_menu() {
    echo -e "${BLUE}🔧 Cleanup Options:${NC}"
    echo "1. Quick cleanup (containers, images, volumes, networks)"
    echo "2. Deep cleanup (everything + build cache)"
    echo "3. Stop project containers only"
    echo "4. Remove project images only"
    echo "5. Remove project volumes only (⚠️  Data loss!)"
    echo "6. Complete project reset (⚠️  All data loss!)"
    echo "7. Show disk usage only"
    echo "8. Exit"
    echo ""
}

# Show initial disk usage
show_disk_usage

# Show menu and get user choice
while true; do
    show_menu
    read -p "Choose an option (1-8): " choice
    echo ""
    
    case $choice in
        1)
            echo -e "${YELLOW}🧹 Starting quick cleanup...${NC}"
            clean_containers
            clean_images
            clean_volumes
            clean_networks
            echo -e "${GREEN}✅ Quick cleanup completed!${NC}"
            show_disk_usage
            ;;
        2)
            echo -e "${YELLOW}🧹 Starting deep cleanup...${NC}"
            clean_containers
            clean_images
            clean_volumes
            clean_networks
            clean_build_cache
            echo -e "${GREEN}✅ Deep cleanup completed!${NC}"
            show_disk_usage
            ;;
        3)
            stop_project_containers
            ;;
        4)
            remove_project_images
            ;;
        5)
            echo -e "${RED}⚠️  WARNING: This will remove all project data!${NC}"
            read -p "Are you sure? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                remove_project_volumes
            else
                echo -e "${BLUE}ℹ️  Operation cancelled${NC}"
            fi
            ;;
        6)
            echo -e "${RED}⚠️  WARNING: This will remove ALL project containers, images, and data!${NC}"
            read -p "Are you sure? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                stop_project_containers
                remove_project_images
                remove_project_volumes
                echo -e "${GREEN}✅ Complete project reset completed!${NC}"
            else
                echo -e "${BLUE}ℹ️  Operation cancelled${NC}"
            fi
            ;;
        7)
            show_disk_usage
            ;;
        8)
            echo -e "${BLUE}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please choose 1-8.${NC}"
            ;;
    esac
    echo ""
done
