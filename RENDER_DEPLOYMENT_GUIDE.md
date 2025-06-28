# 🚀 Render Deployment Guide - GenAI Workflow Builder

## 📋 **Pre-Deployment Checklist**

### ✅ **Production Readiness Verified:**
- [x] Frontend built successfully (`npm run build`)
- [x] Backend Dockerfile optimized for production
- [x] Frontend Dockerfile with Nginx for static serving
- [x] BYOK (Bring Your Own Key) implementation working
- [x] No hardcoded API keys in codebase
- [x] Environment configuration files ready
- [x] Database migrations and models ready
- [x] All features tested and working

## 🎯 **Deployment Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │  PostgreSQL DB  │
│   (Static Site)  │────│   (Web Service)  │────│   (Database)    │
│   Port: 80/443   │    │   Port: 8000     │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 **Step-by-Step Deployment**

### **Step 1: Prepare Repository**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Production ready - BYOK implementation complete"
   git push origin main
   ```

2. **Verify Repository Structure:**
   ```
   ├── backend/
   │   ├── Dockerfile
   │   ├── requirements.txt
   │   └── app/
   ├── frontend/
   │   ├── Dockerfile
   │   ├── package.json
   │   └── build/
   ├── render.yaml
   └── RENDER_DEPLOYMENT_GUIDE.md
   ```

### **Step 2: Create Render Account**

1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Connect your GitHub repository

### **Step 3: Deploy Database**

1. **Create PostgreSQL Database:**
   - Service Type: `PostgreSQL`
   - Name: `genai-workflow-db`
   - Database Name: `genai_workflow`
   - User: `genai_user`
   - Plan: `Starter ($7/month)`

2. **Note Database URL:**
   - Copy the internal database URL for backend configuration

### **Step 4: Deploy Backend**

1. **Create Web Service:**
   - Service Type: `Web Service`
   - Name: `genai-workflow-backend`
   - Environment: `Docker`
   - Dockerfile Path: `./backend/Dockerfile`
   - Plan: `Starter ($7/month)`

2. **Environment Variables:**
   ```
   DATABASE_URL=<from_database_service>
   SECRET_KEY=<auto_generated>
   CORS_ORIGINS=["https://your-frontend-url.onrender.com"]
   VECTOR_STORE_TYPE=memory
   UPLOAD_DIRECTORY=/app/uploads
   MAX_FILE_SIZE=10485760
   DEBUG=false
   ENVIRONMENT=production
   ```

3. **Advanced Settings:**
   - Health Check Path: `/health`
   - Auto-Deploy: `Yes`

### **Step 5: Deploy Frontend**

1. **Create Static Site:**
   - Service Type: `Static Site`
   - Name: `genai-workflow-frontend`
   - Build Command: `cd frontend && npm ci && npm run build`
   - Publish Directory: `frontend/build`

2. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```

3. **Custom Headers (Security):**
   ```
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   ```

## 🔐 **Environment Configuration**

### **Backend Environment Variables:**
| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Auto-generated | PostgreSQL connection string |
| `SECRET_KEY` | Auto-generated | JWT secret key |
| `CORS_ORIGINS` | Frontend URL | Allowed CORS origins |
| `VECTOR_STORE_TYPE` | `memory` | Vector storage type |
| `UPLOAD_DIRECTORY` | `/app/uploads` | File upload directory |
| `MAX_FILE_SIZE` | `10485760` | Max file size (10MB) |
| `DEBUG` | `false` | Debug mode |
| `ENVIRONMENT` | `production` | Environment type |

### **Frontend Environment Variables:**
| Variable | Value | Description |
|----------|-------|-------------|
| `REACT_APP_API_URL` | Backend URL | API endpoint URL |

## 🧪 **Post-Deployment Testing**

### **1. Health Checks:**
```bash
# Backend health
curl https://your-backend-url.onrender.com/health

# Frontend accessibility
curl https://your-frontend-url.onrender.com
```

### **2. API Testing:**
```bash
# Test document upload
curl -X POST https://your-backend-url.onrender.com/api/documents/upload \
  -F "file=@test.pdf"

# Test workflow validation
curl -X POST https://your-backend-url.onrender.com/api/workflow/validate \
  -H "Content-Type: application/json" \
  -d '{"nodes": [], "connections": []}'
```

### **3. Frontend Testing:**
1. Open frontend URL in browser
2. Test workflow builder interface
3. Upload a PDF document
4. Create workflow with LLM node
5. Enter OpenAI API key in LLM node
6. Execute workflow and verify output

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **Build Failures:**
   - Check Dockerfile syntax
   - Verify all dependencies in requirements.txt/package.json
   - Check build logs in Render dashboard

2. **Database Connection Issues:**
   - Verify DATABASE_URL environment variable
   - Check database service status
   - Ensure database migrations run

3. **CORS Errors:**
   - Update CORS_ORIGINS with correct frontend URL
   - Verify frontend is making requests to correct backend URL

4. **File Upload Issues:**
   - Check UPLOAD_DIRECTORY permissions
   - Verify MAX_FILE_SIZE setting
   - Ensure disk space available

## 📊 **Monitoring & Maintenance**

### **Render Dashboard:**
- Monitor service health and uptime
- Check logs for errors
- Monitor resource usage

### **Performance Optimization:**
- Enable auto-scaling if needed
- Monitor response times
- Optimize database queries

### **Security:**
- Regularly update dependencies
- Monitor for security vulnerabilities
- Review access logs

## 💰 **Cost Estimation**

### **Render Pricing (Monthly):**
- PostgreSQL Database: $7/month
- Backend Web Service: $7/month
- Frontend Static Site: Free
- **Total: ~$14/month**

### **Scaling Options:**
- Upgrade to Standard plans for higher performance
- Add Redis for caching
- Enable auto-scaling for traffic spikes

## 🎉 **Success Criteria**

### **Deployment is successful when:**
- ✅ All services show "Live" status in Render
- ✅ Frontend loads without errors
- ✅ Backend health check returns 200
- ✅ Database connections work
- ✅ File uploads function correctly
- ✅ BYOK workflow execution works
- ✅ Output nodes display AI responses
- ✅ No hardcoded API keys in use

## 🔗 **Useful Links**

- [Render Documentation](https://render.com/docs)
- [Render Blueprint Reference](https://render.com/docs/blueprint-spec)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Static Sites on Render](https://render.com/docs/static-sites)

## 📞 **Support**

If you encounter issues during deployment:
1. Check Render service logs
2. Review this deployment guide
3. Verify environment variables
4. Test locally first
5. Contact Render support if needed
