# Quickstart & Validation: AI Itinerary Generation + Kanban Board

**Feature**: `001-ai-itinerary-kanban` · **Date**: 2026-10-12

A run + validation guide. It proves the feature works end-to-end and maps checks to the spec's
acceptance criteria. Implementation code lives in the repo; task breakdown is in `tasks.md`.

## Prerequisites

- Node 24+ and pnpm.
- A Google Gemini API key from Google AI Studio (free tier is fine) — **BYOK**, entered in-app, not
  committed anywhere.

## Setup

```bash
pnpm install
cp .env.example .env.local        # set GEMINI_MODEL + AI_REQUEST_TIMEOUT_MS (NO secret key here)
pnpm dev                          # http://localhost:3000
```

`.env.example` documents every variable (and holds no secrets):

```bash
# Default Gemini model id — verify current id in Google AI Studio.
# NOTE: the Gemini 2.5 line shuts down 2026-10-16; target a Gemini 3.x Flash model.
GEMINI_MODEL=gemini-3.x-flash
AI_REQUEST_TIMEOUT_MS=30000
```

The traveler's **Gemini key is entered in the app's Settings** (stored on-device), never in env.

## Quality gates (match CI)

```bash
pnpm typecheck      # strict TS
pnpm lint           # ESLint
pnpm test           # Vitest unit + integration (AI mocked)
pnpm test:a11y      # axe on primary screens
pnpm test:e2e       # Playwright critical flows
pnpm build          # production build
```

## Validation scenarios → acceptance criteria

| # | Steps | Expected | Covers |
|---|------|---------|--------|
| 1 | Add a valid Gemini key in Settings; enter destination "Bali" + 4 days; generate | A 4-column board appears; every card has name + description + category | US1 AS1, SC-002 |
| 2 | Generate with interests food/history + relaxed pace | Plan reflects interests; fewer items/day for relaxed | US1 AS2 |
| 3 | Generate with destination + length only | Plan still produced with defaults | US1 AS3 |
| 4 | During generation | Clear progress; UI responsive | US1 AS4, SC-001 |
| 5 | Drag a card to another day (mouse) | Card moves; order updates immediately | US2 AS1, SC-003 |
| 6 | **Keyboard only**: Tab to a card, activate pick-up, move to another day, drop | Same move succeeds with no pointer; SR announces it | US2 AS2, SC-003, FR-023 |
| 7 | Add / edit / delete a card | Immediate, isolated updates | US2 AS3/AS4 |
| 8 | **Clear the key**, start a new trip, build it by hand | Full manual planning works; generation shows "unavailable + how to enable" | US2 AS5, SC-005, FR-010/FR-024 |
| 9 | Reload the page | Trip still present, intact | US3 AS1, SC-004 |
| 10 | Export a trip, import it into a fresh session | Trip reproduced exactly (days, cards, order, fields) | US3 AS2, SC-004 |
| 11 | Create several trips, revisit | All saved trips listed and openable | US3 AS3 |
| 12 | Import a malformed / newer-version file | Rejected with a clear message; existing trips untouched | FR-021, edge cases |
| 13 | Force a generation failure/timeout (mock) | Clear non-technical error; retry/continue manually; no partial board | SC-007, FR-024 |
| 14 | Run axe on the trip form and the board | No critical/serious violations | SC-006, FR-023 |
| 15 | Set OS "reduce motion" | DnD animations minimized; interactions still work | Edge case, FR-023 |

## Done = demo-ready

All 15 scenarios pass and all quality gates are green. Scenario 6 (keyboard DnD), 8 (no-key manual
path), and 13 (graceful AI failure) are the three that most distinguish this from a typical demo —
prioritize them when showing the work.
