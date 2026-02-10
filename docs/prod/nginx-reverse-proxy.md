# Nginx Reverse Proxy (Production)

## Architecture

```
Internet -> [Nginx :80] -> /api/* -> api:9000 (Laravel FPM)
                        -> /*    -> frontend:3000 (Next.js)
```

## TLS Termination

TLS is terminated at the external load balancer (e.g., AWS ALB, Cloudflare, etc.).
Nginx receives plain HTTP on port 80 and forwards `X-Forwarded-Proto` headers.

If you need Nginx to terminate TLS directly, mount certs and add a `listen 443 ssl` block.

## Health Check

- `/nginx-health` — returns 200 "ok" (for LB health checks)
- `/api/healthz` — Laravel DB health
- `/api/health/ready` — production readiness (Stripe envs, config cache, queue)

## Required Headers

Nginx sets these automatically:
- `X-Real-IP` — client IP
- `X-Forwarded-For` — proxy chain
- `X-Forwarded-Proto` — original protocol (http/https)
- `X-Request-Id` — nginx `$request_id` (if not already set)

## Usage

```bash
docker compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost/nginx-health
curl http://localhost/api/healthz
```
