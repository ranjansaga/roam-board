# ADR-0001: Next.js App Router as app shell and server boundary

- **Status**: Accepted
- **Date**: 2026-10-12

## Context

Roam Board is web-first and BYOK. The constitution requires that privileged external calls (the AI
provider) go through a server-side boundary and that no secret is in the client bundle. We also want
static-first rendering and free/low-cost hosting.

## Decision

Use **Next.js 16 (App Router)** as a single deployable app. The AI boundary is a server-only Route
Handler (`app/api/generate/route.ts`); UI is React Server/Client Components. Deploy on Vercel's free
tier.

## Consequences

- One codebase provides both UI and the server choke point for AI — no separate backend (Principle VII).
- Server Components keep the app static-first; the API route keeps the key server-side.
- Couples us to Next's conventions; acceptable given its ubiquity and recognition.
