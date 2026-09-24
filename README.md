# GitHub Repository Analyzer API

Node.js, TypeScript, and Express backend foundation for a GitHub repository analyzer.

## Commands

- `npm run dev` starts the development server with file watching.
- `npm run build` compiles TypeScript into `dist/`.
- `npm test` runs the test suite.
- `npm start` runs the compiled server.

Copy `.env.example` to `.env` before adding local configuration.
Set `MONGO_URI` to a reachable MongoDB database before starting the server. In
production, use a managed MongoDB connection string rather than a localhost URI.

## API foundation

- `GET /api/health` returns the service health status.
- `POST /api/analyze` analyzes a GitHub repository, persists the validated result, and returns an `analysisId`.
- `GET /api/analyses/:id` retrieves a persisted analysis without returning source-file contents.

Persisted analyses contain repository metadata, selected file metadata, the validated report, and creation time. API keys and raw source contents are never stored.
"# Repolens"

## Deployment

### Backend

Required backend environment variables are listed in `.env.example`:

- `NODE_ENV=production`
- `PORT`
- `GITHUB_API_URL`
- `GITHUB_TOKEN` (backend only, when required)
- `LLM_API_URL`
- `LLM_API_KEY` (backend only)
- `LLM_MODEL`
- `MONGO_URI`
- `FRONTEND_URL` (the deployed frontend origin)
- `GITHUB_REQUEST_TIMEOUT_MS`
- `LLM_REQUEST_TIMEOUT_MS`
- `GITHUB_FILE_RESPONSE_MAX_BYTES`
- `MAX_SOURCE_FILE_BYTES`
- `MAX_SOURCE_CONTENT_BYTES`
- `ANALYZE_RATE_LIMIT_WINDOW_MS`
- `ANALYZE_RATE_LIMIT_MAX`
- `QUESTION_RATE_LIMIT_WINDOW_MS`
- `QUESTION_RATE_LIMIT_MAX`

Build and start the backend from the repository root:

```bash
npm install
npm run build
npm start
```

The backend requires a reachable MongoDB deployment. Configure network access,
TLS, and credentials in the MongoDB provider; do not use the development
localhost value in production. Startup fails if `MONGO_URI` is missing or the
database cannot be reached.

### Frontend

Set `VITE_API_BASE_URL` to the deployed backend API base URL before building.
For example, use `https://api.example.com/api` when the frontend and backend
are deployed separately. The default `/api` is suitable when both are served
behind the same origin.

For local development, `VITE_API_PROXY_TARGET` optionally points the Vite
development proxy at the backend. It is not used in the production build.

Build the frontend from its directory:

```bash
cd frontend
npm install
npm run build
```

Deploy the generated `frontend/dist` directory to a static hosting provider.
The frontend does not receive `GITHUB_TOKEN`, `LLM_API_KEY`, or `MONGO_URI`.

The unauthenticated health check is available at `GET /api/health` and returns
`{"status":"ok"}`.
