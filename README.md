# GitHub Repository Analyzer API

Node.js, TypeScript, and Express backend foundation for a GitHub repository analyzer.

## Commands

- `npm run dev` starts the development server with file watching.
- `npm run build` compiles TypeScript into `dist/`.
- `npm test` runs the test suite.
- `npm start` runs the compiled server.

Copy `.env.example` to `.env` before adding local configuration.
Set `MONGO_URI` to a reachable MongoDB database before starting the server.

## API foundation

- `GET /api/health` returns the service health status.
- `POST /api/analyze` analyzes a GitHub repository, persists the validated result, and returns an `analysisId`.
- `GET /api/analyses/:id` retrieves a persisted analysis without returning source-file contents.

Persisted analyses contain repository metadata, selected file metadata, the validated report, and creation time. API keys and raw source contents are never stored.
"# Repolens" 
