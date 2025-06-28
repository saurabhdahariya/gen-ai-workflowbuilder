# 🐳 Docker Containerization Guide

## GenAI Workflow Builder - Complete Docker Setup

This guide provides comprehensive instructions for building, running, and deploying the GenAI Workflow Builder using Docker containers.

## 📋 **Prerequisites**

### Required Software:
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git** for cloning the repository

### System Requirements:
- **RAM**: Minimum 8GB, Recommended 16GB
- **Storage**: 10GB free space for images and volumes
- **CPU**: 2+ cores recommended

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │  PostgreSQL DB  │
│   (Port: 3000)   │────│   (Port: 8000)   │────│   (Port: 5432)  │
│   Nginx + React  │    │   Python + API   │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Qdrant Vector │
                    │   (Port: 6333)  │
                    │   Vector Store  │
                    └─────────────────┘
```

## 🐳 **Docker Services**

### **1. Frontend Service**
- **Base Image**: Node.js 18 Alpine + Nginx Alpine
- **Build**: Multi-stage (build + serve)
- **Port**: 3000
- **Features**: Production-optimized React build

### **2. Backend Service**
- **Base Image**: Python 3.11 Slim
- **Port**: 8000
- **Features**: FastAPI + SQLAlchemy + Vector processing

### **3. Database Service**
- **Image**: PostgreSQL 15 Alpine
- **Port**: 5432
- **Features**: Persistent storage + health checks

### **4. Vector Database Service**
- **Image**: Qdrant v1.7.0
- **Ports**: 6333 (HTTP), 6334 (gRPC)
- **Features**: Vector embeddings storage

## 🚀 **Quick Start**

### **Development Environment:**
```bash
# Clone repository
git clone <your-repo-url>
cd genai-workflow-builder

# Start all services
docker-compose up -d

# Check health
./docker-health-check.sh

# Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### **Production Environment:**
```bash
# Build production images
./docker-build.sh

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Check health
./docker-health-check.sh docker-compose.prod.yml
```

## 🔨 **Building Images**

### **Automated Build (Recommended):**
```bash
# Linux/Mac
./docker-build.sh [version] [--push]

# Windows PowerShell
.\docker-build.ps1 -Version "v1.0.0" -Push
```

### **Manual Build:**
```bash
# Backend
docker build -t genai-workflow-backend:latest ./backend

# Frontend
docker build -t genai-workflow-frontend:latest ./frontend
```

## ⚙️ **Configuration**

### **Environment Variables:**

#### **Development (.env):**
```env
# Database
POSTGRES_DB=genai_workflow
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=8000
POSTGRES_PORT=5432
QDRANT_PORT=6333

# API URLs
REACT_APP_API_URL=http://localhost:8000
```

#### **Production (.env.production):**
```env
# Database
POSTGRES_DB=genai_workflow_prod
POSTGRES_USER=genai_user
POSTGRES_PASSWORD=<secure-password>

# Security
SECRET_KEY=<secure-secret-key>

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# API URLs
REACT_APP_API_URL=https://api.yourdomain.com
```

## 🔧 **Common Commands**

### **Service Management:**
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# View logs
docker-compose logs -f backend

# Scale services
docker-compose up -d --scale backend=3
```

### **Development:**
```bash
# Rebuild and start
docker-compose up --build

# Run with specific compose file
docker-compose -f docker-compose.prod.yml up -d

# Execute commands in container
docker-compose exec backend bash
docker-compose exec frontend sh
```

### **Maintenance:**
```bash
# Remove all containers and volumes
docker-compose down -v

# Clean up unused images
docker system prune -a

# View resource usage
docker stats

# Backup database
docker-compose exec postgres pg_dump -U postgres genai_workflow > backup.sql
```

## 🏥 **Health Monitoring**

### **Automated Health Checks:**
```bash
# Check all services
./docker-health-check.sh

# Check production services
./docker-health-check.sh docker-compose.prod.yml
```

### **Manual Health Checks:**
```bash
# Backend API
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000

# Qdrant
curl http://localhost:6333/health

# Database
docker-compose exec postgres pg_isready -U postgres
```

## 🔒 **Security Best Practices**

### **Production Security:**
1. **Change default passwords** in .env.production
2. **Use secrets management** for sensitive data
3. **Enable SSL/TLS** with reverse proxy
4. **Limit container privileges** (non-root users)
5. **Regular security updates** for base images

### **Network Security:**
```yaml
# Custom network configuration
networks:
  genai_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 📊 **Performance Optimization**

### **Resource Limits:**
```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
    reservations:
      memory: 1G
      cpus: '0.5'
```

### **Caching:**
- **Redis** for session/API caching
- **Nginx** for static file caching
- **Docker layer** caching for builds

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :3000

# Change ports in .env file
FRONTEND_PORT=3001
```

#### **Memory Issues:**
```bash
# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Check container memory usage
docker stats
```

#### **Build Failures:**
```bash
# Clear build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache
```

#### **Database Connection:**
```bash
# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec backend python -c "from app.database import engine; print(engine.execute('SELECT 1').scalar())"
```

## 📦 **Deployment Options**

### **1. Local Development:**
- Use `docker-compose.yml`
- Hot reloading enabled
- Debug mode active

### **2. Production Deployment:**
- Use `docker-compose.prod.yml`
- Optimized builds
- Health checks enabled
- Resource limits set

### **3. Cloud Deployment:**
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**
- **Kubernetes** (with Helm charts)

## 🔄 **CI/CD Integration**

### **GitHub Actions Example:**
```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build images
        run: ./docker-build.sh ${{ github.sha }}
      - name: Push to registry
        run: ./docker-build.sh ${{ github.sha }} --push
```

## 📚 **Additional Resources**

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [React Docker Guide](https://create-react-app.dev/docs/deployment/#docker)

## 🎯 **Next Steps**

1. **Test locally** with `docker-compose up`
2. **Configure environment** variables
3. **Set up monitoring** and logging
4. **Deploy to production** environment
5. **Set up CI/CD** pipeline
