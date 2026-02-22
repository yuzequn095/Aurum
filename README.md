# Aurum

Aurum is a privacy-first, AI-powered personal finance assistant (Web-first MVP).

## Tech Stack
- Web: Next.js (TypeScript)
- API: NestJS (TypeScript, REST)
- Monorepo: pnpm workspaces + Turborepo

## Local Development

### Prerequisites
- Node.js: v20 (LTS)
- pnpm: v9

### Install
- pnpm install

### Run (Web + API)
- pnpm dev

### Run with Docker Compose
- `docker compose -f infra/docker/docker-compose.yml up -d`

### Prisma
- `pnpm --filter api exec prisma db seed`
- `pnpm --filter api exec prisma studio`

### Ports
- Web: http://localhost:3000
- API: http://localhost:3001
- Health: http://localhost:3001/v1/health

## Environment Variables

### Web (apps/web/.env.local)
- NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

### API (apps/api/.env)
- PORT=3001
- CORS_ORIGIN=http://localhost:3000

## Scripts

- pnpm dev: start web + api in parallel
- pnpm lint: lint all packages
- pnpm typecheck: typecheck all packages
