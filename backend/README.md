# GenAI Workflow Builder - Backend

A FastAPI-based backend for the No-Code/Low-Code AI Workflow Builder platform.

## Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **PostgreSQL Database**: Robust relational database with SQLAlchemy ORM
- **Document Processing**: PDF text extraction using PyMuPDF
- **Vector Embeddings**: OpenAI embeddings with ChromaDB storage
- **LLM Integration**: OpenAI GPT integration for AI responses
- **Workflow Orchestration**: Execute user-defined AI workflows
- **Chat History**: Store and retrieve conversation history

## Project Structure

```
backend/
├── app/
│   ├── api/                 # API route handlers
│   ├── core/                # Core configuration and database
│   ├── models/              # Pydantic and SQLAlchemy models
│   ├── services/            # Business logic services
│   ├── main.py              # FastAPI application entry point
│   └── __init__.py
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker configuration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Setup Instructions

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- OpenAI API Key

### Installation

1. **Clone the repository and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

5. **Set up PostgreSQL database:**
   ```sql
   CREATE DATABASE genai_workflow;
   ```

6. **Run the application:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Docker Setup

1. **Build the Docker image:**
   ```bash
   docker build -t genai-workflow-backend .
   ```

2. **Run with Docker Compose (from project root):**
   ```bash
   docker-compose up -d
   ```

## API Endpoints

### Health Check
- `GET /health` - Application health status
- `GET /` - API information

### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/genai_workflow` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings and LLM | Required |
| `CHROMA_PERSIST_DIRECTORY` | ChromaDB storage directory | `./chroma_db` |
| `SECRET_KEY` | JWT secret key | `your-secret-key-change-in-production` |
| `UPLOAD_DIRECTORY` | File upload storage directory | `./uploads` |
| `DEBUG` | Enable debug mode | `false` |

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
isort app/
```

### Database Migrations
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Contributing

1. Follow PEP 8 style guidelines
2. Add type hints to all functions
3. Write comprehensive docstrings
4. Include unit tests for new features
5. Update documentation as needed
