# Docker Build Script for GenAI Workflow Builder (PowerShell)
# This script builds all Docker images for the application

param(
    [string]$Version = "latest",
    [string]$Registry = $env:DOCKER_REGISTRY,
    [switch]$Push = $false
)

# Configuration
$ProjectName = "genai-workflow-builder"
$ErrorActionPreference = "Stop"

Write-Host "🐳 Building Docker Images for GenAI Workflow Builder" -ForegroundColor Blue
Write-Host "=====================================================" -ForegroundColor Blue
Write-Host "Version: $Version" -ForegroundColor Yellow
Write-Host "Registry: $(if ($Registry) { $Registry } else { 'local' })" -ForegroundColor Yellow
Write-Host ""

# Function to build image
function Build-Image {
    param(
        [string]$Service,
        [string]$Context,
        [string]$Dockerfile
    )
    
    $TagName = "$ProjectName-$Service`:$Version"
    if ($Registry) {
        $TagName = "$Registry/$TagName"
    }
    
    Write-Host "🔨 Building $Service image..." -ForegroundColor Yellow
    Write-Host "Context: $Context" -ForegroundColor Blue
    Write-Host "Dockerfile: $Dockerfile" -ForegroundColor Blue
    Write-Host "Tag: $TagName" -ForegroundColor Blue
    Write-Host ""
    
    try {
        docker build -t $TagName -f $Dockerfile $Context
        Write-Host "✅ Successfully built $Service image" -ForegroundColor Green
        Write-Host "   Tag: $TagName" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "❌ Failed to build $Service image" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Build backend image
Write-Host "📦 Building Backend Service" -ForegroundColor Yellow
Write-Host "============================" 
Build-Image -Service "backend" -Context "./backend" -Dockerfile "./backend/Dockerfile"

# Build frontend image
Write-Host "🎨 Building Frontend Service" -ForegroundColor Yellow
Write-Host "=============================" 
Build-Image -Service "frontend" -Context "./frontend" -Dockerfile "./frontend/Dockerfile"

# List built images
Write-Host "📋 Built Images:" -ForegroundColor Blue
Write-Host "================"
docker images | Select-String $ProjectName | Select-Object -First 10

Write-Host ""
Write-Host "🎉 All images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Blue
Write-Host "1. Test images locally:"
Write-Host "   docker-compose up"
Write-Host ""
Write-Host "2. Run production stack:"
Write-Host "   docker-compose -f docker-compose.prod.yml up"
Write-Host ""
Write-Host "3. Push to registry (if configured):"
Write-Host "   docker-compose -f docker-compose.prod.yml push"
Write-Host ""

# Optional: Push to registry
if ($Registry -and $Push) {
    Write-Host "📤 Pushing images to registry..." -ForegroundColor Yellow
    docker push "$Registry/$ProjectName-backend:$Version"
    docker push "$Registry/$ProjectName-frontend:$Version"
    Write-Host "✅ Images pushed to registry" -ForegroundColor Green
}

Write-Host "✨ Docker build completed successfully!" -ForegroundColor Green
