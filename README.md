# GenAI Workflow Builder

A No-Code/Low-Code platform for building intelligent AI workflows using a visual drag-and-drop interface.

## 🎯 Project Overview

This application enables non-technical users to easily build their own intelligent question-answering workflows without writing code. Users can:

- **Drag & Drop Components**: Visually design AI workflows using four core components
- **Connect & Configure**: Link components and configure their settings
- **Upload Documents**: Process PDFs and generate embeddings for context
- **Chat Interface**: Interact with AI through a conversational interface
- **Workflow Execution**: Run custom workflows with real-time processing

## 🧠 Core Components

### 1. User Query
Entry point for user questions and inputs.

### 2. Knowledge Base
- Upload PDF documents
- Extract text using PyMuPDF
- Generate embeddings with OpenAI
- Store vectors in ChromaDB for similarity search

### 3. LLM Engine
- Connect to OpenAI GPT models
- Optional web search integration
- Context-aware response generation

### 4. Output
Display AI responses in a chat interface with conversation history.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│ • React Flow    │◄──►│ • Document APIs │◄──►│ • Documents     │
│ • Drag & Drop   │    │ • Embeddings    │    │ • Chat History  │
│ • Chat UI       │    │ • Workflow Exec │    │ • Workflows     │
│ • Configuration │    │ • Chat Logging  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │    Qdrant       │
                       │                 │
                       │ • Vector Store  │
                       │ • Embeddings    │
                       │ • Similarity    │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone Repository

```bash
git clone <repository-url>
cd genai-workflow-builder
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your OpenAI API key
nano .env
```

### 3. Start with Docker

```bash
# Start all services
cd deployment
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📁 Project Structure

```
genai-workflow-builder/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # UI components & nodes
│   │   ├── pages/           # Application pages
│   │   ├── services/        # API services
│   │   └── utils/           # Utilities
│   └── package.json
│
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Configuration
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic
│   │   └── main.py         # App entry point
│   └── requirements.txt
│
├── database/               # Database scripts
│   └── init.sql
│
├── deployment/             # Docker configuration
│   ├── docker-compose.yml
│   └── README.md
│
├── .env.example           # Environment template
└── README.md             # This file
```

## 🔧 Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Database Setup

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name genai_postgres \
  -e POSTGRES_DB=genai_workflow \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine
```

## 📚 API Documentation

### Core Endpoints

#### Documents
- `POST /api/documents/upload` - Upload PDF document
- `GET /api/documents/` - List documents
- `GET /api/documents/{id}` - Get document details
- `DELETE /api/documents/{id}` - Delete document

#### Embeddings
- `POST /api/embeddings/generate` - Generate embeddings
- `GET /api/embeddings/search` - Search similar content
- `DELETE /api/embeddings/{document_id}` - Delete embeddings

#### Workflow
- `POST /api/workflow/execute` - Execute workflow
- `POST /api/workflow/validate` - Validate workflow
- `GET /api/workflow/executions/{user_id}` - Get execution history

#### Chat
- `POST /api/chat/save` - Save chat message
- `GET /api/chat/history/{user_id}` - Get chat history
- `DELETE /api/chat/history/{user_id}` - Clear chat history

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings and LLM | Yes |
| `DATABASE_URL` | PostgreSQL connection string | No* |
| `SECRET_KEY` | JWT secret key | No* |
| `CHROMA_PERSIST_DIRECTORY` | ChromaDB storage path | No* |
| `UPLOAD_DIRECTORY` | File upload storage path | No* |
| `DEBUG` | Enable debug mode | No |

*Has default values

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 🚢 Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Configure HTTPS** with reverse proxy (nginx/traefik)
3. **Set up monitoring** and logging
4. **Configure backups** for database and files
5. **Scale services** as needed

### Docker Production

```bash
# Production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` endpoints
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions

## 🔮 Roadmap

- [ ] Advanced workflow templates
- [ ] Multi-model LLM support
- [ ] Real-time collaboration
- [ ] Workflow marketplace
- [ ] Advanced analytics
- [ ] Mobile application
