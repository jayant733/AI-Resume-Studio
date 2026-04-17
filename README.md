# AI Resume Optimization & Generation Platform

Production-style full-stack SaaS for multimodal resume parsing, job matching, RAG-driven optimization, and ATS-friendly PDF generation.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL, ChromaDB, OpenAI API integration
- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- AI pipeline: resume parser, embeddings, semantic retrieval, optimization agent, vision captioning, PDF renderer
- Deployment: Docker, docker-compose

## Folder Structure

```text
.
├── backend
│   ├── app
│   │   ├── agents
│   │   ├── api
│   │   ├── db
│   │   ├── models
│   │   ├── services
│   │   ├── templates
│   │   └── utils
│   ├── Dockerfile
│   └── requirements.txt
├── frontend
│   ├── app
│   ├── components
│   ├── lib
│   └── Dockerfile
└── docker-compose.yml
```

## Core Features

- Signup/login authentication with bearer-token based user sessions
- Resume parser for `PDF`, `DOCX`, and LinkedIn JSON payloads
- Multimodal profile-image captioning through a vision-capable LLM path
- Semantic job matching with embeddings and Chroma vector search
- Custom multi-step optimization agent:
  `Parse -> Embed -> Retrieve -> Optimize -> Generate -> Format`
- ATS-friendly PDF generation using Jinja2 + WeasyPrint
- Interview question generator for technical, behavioral, and project deep-dive prep
- Editable multi-page frontend workflow:
  upload, job analysis, AI suggestions, preview and download

## API Endpoints

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /upload-resume`
- `POST /analyze-job`
- `POST /generate-interview-questions`
- `POST /generate-resume`
- `GET /download-pdf?output_id=<id>`
- `GET /health`

## Local Development

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Add your `OPENAI_API_KEY` in `backend/.env` for hosted embeddings, resume optimization, and image captioning.

### 2. Run with Docker

```bash
docker compose up --build
```

Services:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Run without Docker

Backend:

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Database Schema

### PostgreSQL tables

- `users`: candidate identity and account metadata
- `resumes`: parsed resume source, raw text, structured JSON, image metadata
- `jobs`: target job descriptions and extracted requirements
- `generated_outputs`: optimized resume JSON and generated PDF path

### Vector DB

- `resume_fragments`: experience bullets and project snippets embedded for retrieval
- `job_requirements`: semantic job requirement fragments

## AI Workflow

1. Parse uploaded resume or LinkedIn JSON into structured sections.
2. Embed experience fragments and store them in Chroma.
3. Parse the job description into skills, responsibilities, and requirements.
4. Retrieve semantically relevant resume fragments for the target role.
5. Call the LLM optimization layer to rewrite bullets, generate the summary, and prioritize ATS keywords.
6. Render the final HTML template into a downloadable PDF.

## Deployment Notes

- Works well on Render, Railway, AWS ECS, or any container platform.
- Replace the local Postgres service with managed PostgreSQL in production.
- Persist `backend/data` or move Chroma storage to a managed vector solution such as Pinecone.
- Store API keys and database credentials in your deployment secret manager.

## Implementation Notes

- If `OPENAI_API_KEY` is missing, the app still runs with deterministic local embedding and resume fallback logic so the pipeline remains usable during development.
- For production quality outputs, use a real OpenAI key and a vision-capable model.
