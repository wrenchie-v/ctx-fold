# ctx-fold

LLM Context Compression & Storage Backend - An intermediary wrapper that compresses conversation context and stores LLM interactions in MySQL.

> ⚠️ **DISCLAIMER**: This project is a **Work In Progress (WIP)** and is currently barebones. Some elements may not work as expected. Use at your own risk and expect breaking changes.

## Overview

ctx-fold acts as a middleware between your application and LLM APIs. Instead of direct API calls, it:

- Intercepts prompts and modifies them to request structured JSON responses
- Compresses conversation context using LLM-generated summaries
- Stores all prompts, responses, and compressed summaries in MySQL
- Provides rolling context compression for efficient token usage

## Tech Stack

- **NestJS** + **Fastify** - Backend framework
- **TypeORM** + **MySQL** - Database layer
- **Axios** - HTTP client for LLM calls
- **LM Studio** - Local LLM inference (default)

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- LM Studio running locally (or compatible OpenAI API endpoint)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ctx-fold

# Install dependencies
npm install

# Copy environment config
copy env.example .env

# Start MySQL
docker-compose up -d

# Run the server
npm run start:dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | MySQL host |
| `DB_PORT` | 3306 | MySQL port |
| `DB_USERNAME` | ctxuser | MySQL username |
| `DB_PASSWORD` | ctxpass123 | MySQL password |
| `DB_DATABASE` | ctx_fold_db | Database name |
| `LM_STUDIO_URL` | http://localhost:1234/v1/chat/completions | LLM endpoint |
| `LM_STUDIO_MODEL` | local-model | Model name |
| `APP_PORT` | 3000 | Server port |

## API Endpoints

### `POST /api/prompt`

Send a prompt to the LLM with automatic context compression.

**Request:**
```json
{
  "prompt": "Your question here",
  "sessionId": "unique-session-id",
  "model": "optional-model-name",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

**Response:**
```json
{
  "id": "uuid",
  "response": "Full LLM response",
  "sumResponse": "Compressed context summary",
  "model": "model-name",
  "latencyMs": 1234,
  "tokens": {
    "prompt": 100,
    "response": 500,
    "total": 600
  }
}
```

### `GET /api/context/session/:sessionId`

Get all context history for a session.

### `GET /api/context/compressed/:sessionId`

Get the latest compressed context for a session.

### `GET /api/context/:id`

Get a specific context record by ID.

### `GET /api/contexts?limit=10`

Get recent context records.

### `GET /api/health`

Health check for database and LLM connections.

## How It Works

1. **Prompt Received** - User sends prompt with optional `sessionId`
2. **Context Injection** - Latest compressed summary from session is injected as context
3. **System Prompt** - LLM is instructed to respond in JSON with `response` and `summarized_response`
4. **Rolling Compression** - LLM merges previous context + new response into compressed summary
5. **Storage** - Both full response and compressed summary stored in MySQL
6. **Next Request** - Uses new compressed summary as context (token-efficient)

## Scripts

```bash
npm run start:dev    # Development with watch mode
npm run start        # Production start
npm run build        # Build for production
npm run docker:up    # Start MySQL container
npm run docker:down  # Stop MySQL container
```

## License

MIT
