# Cloudflare Test - Deployment Guide

## Quick Start - Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Build packages:
```bash
pnpm build
```

3. Start development servers:
```bash
# In one terminal - start the worker
cd apps/worker
pnpm dev

# In another terminal - start the web app
cd apps/web
pnpm dev
```

The web app will be available at http://localhost:5173 and the worker at http://localhost:8787.

## Deployment

### Deploy Everything (Development)
```bash
pnpm deploy
```

This builds all packages and deploys both the worker and web app.

### Deploy Worker Only

Development environment:
```bash
pnpm deploy:worker
```

Staging environment:
```bash
pnpm deploy:worker:staging
```

Production environment:
```bash
pnpm deploy:worker:production
```

### Deploy Web App Only

```bash
pnpm deploy:web
```

## Environment Configuration

### Worker Environments

The worker has three environments configured in `apps/worker/wrangler.toml`:
- `development` (default)
- `staging`
- `production`

Each environment has different CORS policies. Update the allowed origins in `apps/worker/src/index.ts`.

### Web App Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and configure:

```bash
VITE_WORKER_URL=http://localhost:8787  # For local dev
# or
VITE_WORKER_URL=https://cloudflare-test-worker.your-subdomain.workers.dev  # For deployed worker
```

## Cloudflare Setup

### First Time Setup

1. Install Wrangler globally (optional):
```bash
pnpm add -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Create Pages project (first deployment):
```bash
cd apps/web
wrangler pages project create cloudflare-test-web
```

### Update Worker Name

Edit `apps/worker/wrangler.toml` and change the `name` field to your desired worker name.

### Configure CORS Origins

Edit `apps/worker/src/index.ts` and update the CORS origins for staging and production:

```typescript
// Line ~70-80 in corsResponse function
if (env.ENVIRONMENT === "staging") {
  headers.set("Access-Control-Allow-Origin", "https://your-staging-domain.pages.dev")
} else {
  headers.set("Access-Control-Allow-Origin", "https://your-production-domain.pages.dev")
}
```

## Project Structure

```
cloudflare-test/
├── apps/
│   ├── web/          # React app (Cloudflare Pages)
│   └── worker/       # Worker API (Cloudflare Workers)
└── packages/
    ├── core/         # Shared utilities (Result, TypedRpc)
    └── shared/       # Shared RPC definitions
```
