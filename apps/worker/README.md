# Cloudflare Worker

This worker handles RPC requests from the web app.

## Development

```bash
pnpm dev
```

This runs `wrangler dev` which starts a local worker server.

## Deployment

Deploy to development environment:
```bash
pnpm deploy
```

Deploy to specific environment:
```bash
wrangler deploy --env staging
wrangler deploy --env production
```

## Endpoints

- `POST /api/hello-world` - HelloWorld RPC endpoint

## Environment Variables

Configured via `wrangler.toml`:
- `ENVIRONMENT` - Current environment (development/staging/production)
- Affects CORS policy and response behavior
