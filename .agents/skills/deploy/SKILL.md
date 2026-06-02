---
name: deploy
description: Pre-deployment checklist and Vercel deployment for inmogrid.cl. Use when preparing a production deployment, verifying build health, or triggering a deploy.
context: fork
agent: infrastructure-agent
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(npx vercel *), mcp__vercel__*, Bash(git *)
disable-model-invocation: false
---

# Deploy to Production

Run the pre-deployment checklist and deploy inmogrid.cl to Vercel.

## Pre-deploy Checklist

1. **Build**: Run `npm run build` — must succeed with zero errors
2. **Lint**: Run `npm run lint` — no errors allowed
3. **Tests**: Run `npm run test:public-api` — public API health must pass
4. **TypeScript**: Verify no type errors in build output
5. **Environment**: Confirm required env vars are set in Vercel (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
6. **Git status**: Ensure working tree is clean and on `main` branch

## Deploy

- Production deploys happen automatically on push to `main` via Vercel
- For manual deploy: `npx vercel --prod`
- After deploy: verify `/api/public/health` returns 200

## Rollback

- If issues detected: use Vercel dashboard to promote previous deployment
- Check runtime logs: `mcp__vercel__get_runtime_logs`
