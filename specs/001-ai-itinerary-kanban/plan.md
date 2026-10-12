# Implementation Plan: AI Itinerary Generation + Kanban Board

**Branch**: `001-ai-itinerary-kanban` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-ai-itinerary-kanban/spec.md`

## Summary

Feature 001 is a single Next.js (App Router) web app. A trip-creation form collects the traveler's
inputs (destination, 1–7 day length, optional interests/pace/party/accessibility needs). A
**server-side Route Handler — the single AI boundary** — calls Google Gemini through the Vercel AI
SDK's `generateObject` with a **Zod schema**, returning a structurally validated multi-day
itinerary. The result renders on an **accessible dnd-kit Kanban board** (columns = days, cards =
places/activities), which the traveler then edits entirely by hand (add/edit/delete/reorder/move via
pointer **and** keyboard). Trips persist locally through a **`TripRepository` interface over
localStorage** and export/import as a **versioned JSON file**. Bring-your-own-key: the traveler's
Gemini key lives on-device and is sent per request to the server route — never bundled, never stored
server-side. The app is fully usable without AI (manual board building), and the entire experience
targets **WCAG 2.2 AA**.

## Technical Context

**Language/Version**: TypeScript 5.x (strict); React 19; Node 24 for build/tooling.

**Primary Dependencies**: Next.js 16 (App Router) · Vercel AI SDK (`ai` v5 + `@ai-sdk/google`) · Zod ·
dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) · Zustand · Tailwind CSS · shadcn/ui (Radix UI
primitives).

**Storage**: Browser `localStorage`, accessed only through a `TripRepository` interface. No server
database; no server-side storage of user trips.

**Testing**: Vitest + React Testing Library (unit/integration); Playwright (critical E2E flows);
axe-core via `jest-axe` (component) and Playwright's axe integration (page) for automated
accessibility checks.

**Target Platform**: Modern evergreen browsers (desktop + mobile web). Deploy target: Vercel free
tier.

**Project Type**: Web application — a single Next.js app (UI + its own server Route Handlers).

**Performance Goals**: Board interactions (add/edit/delete/reorder/move) reflect in **< 100 ms**;
static-first initial load; generation latency is dominated by the model and is shown with clear
progress.

**Constraints**: WCAG 2.2 AA; no secret/privileged keys in the client bundle; deployable on a free
tier; fully usable for manual create/view/edit when AI is unavailable; AI usage bounded (1–7 days,
~6 items/day, duplicate-request collapsing, request-size cap).

**Scale/Scope**: Single user per device; local-only trips; a handful of saved trips; small boards
(≤ 7 columns × ~6 cards). Not built for multi-user or large-scale data.

**Model configuration note**: The Gemini model id is an environment-configured value
(`GEMINI_MODEL`), **not** a hardcoded constant. The Gemini **2.5** line is scheduled for shutdown on
**2026-10-16**, so the default targets the **Gemini 3.x Flash family** (cost-appropriate for BYOK);
the exact id is confirmed at implementation against Google's current model list. See
[research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | How this plan complies | Status |
|---|-----------|------------------------|--------|
| I | Spec-Driven, Documented in the Open | Approved spec + clarifications precede this plan; four ADRs recorded (see Phase 1); artifacts committed as discrete reviewable commits. | ✅ PASS |
| II | Vertical Slices on a Forward-Compatible Core | `Place` schema carries nullable `cost`, `coordinates`, `accessibility` from day one (FR-025, [data-model.md](./data-model.md)); export carries a `schemaVersion`. No later feature needs a breaking migration. | ✅ PASS |
| III | Accessibility (WCAG 2.2 AA) | Radix/shadcn accessible primitives; dnd-kit keyboard sensor + screen-reader announcements for the board; `prefers-reduced-motion` honored; axe gate in CI. | ✅ PASS |
| IV | AI Bounded, Observable, Degradable | Single server-side AI boundary (`lib/ai` + one Route Handler); timeout; Zod-validated output; token/cost logged; app fully usable without AI. | ✅ PASS |
| V | Cost & Abuse Awareness | Days bounded 1–7 + ~6 items/day (FR-027); duplicate in-flight generation collapsed; request-size cap; deterministic-request cache seam; documented seams for rate-limit + hard cost cap before any server-key mode. | ✅ PASS |
| VI | Typed, Tested, Trustworthy | Zod schemas are the single source of truth (schema → TS types → API → UI); tests target AI parsing, domain/board logic, and critical flows; CI = typecheck + lint + test + axe + build. | ✅ PASS |
| VII | Simplicity & Reversibility (YAGNI) | Boring, dominant tech; no accounts/multi-city/collab/booking machinery; `TripRepository` + provider-agnostic AI boundary keep storage and model reversible; ADRs record each nontrivial choice. | ✅ PASS |

**Result: PASS — no violations.** Complexity Tracking table below is intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-itinerary-kanban/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions, rationale, alternatives
├── data-model.md        # Phase 1 output — entities, Zod schema shape, validation
├── quickstart.md        # Phase 1 output — run + validate guide
├── contracts/
│   ├── generate-itinerary.md   # POST /api/generate request/response contract
│   └── trip-export.schema.md   # Versioned trip export/import file contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
app/                              # Next.js App Router
├── layout.tsx                    # Root layout (theme tokens, skip-link, a11y landmarks)
├── page.tsx                      # Home: trip list + "new trip" entry
├── trips/[tripId]/page.tsx       # Board view for one trip
├── globals.css                   # Tailwind layers + design tokens (light/dark)
└── api/
    └── generate/route.ts         # THE AI boundary (server-only): validates input,
                                  #   calls lib/ai, returns Zod-validated itinerary

components/
├── board/                        # KanbanBoard, DayColumn, PlaceCard, dnd sensors
├── trip-form/                    # Create-trip form (inputs + validation)
├── settings/                     # BYOK key entry + "no key" empty state
├── trip/                         # Trip list, export/import controls
└── ui/                           # shadcn/ui primitives (owned, accessible)

lib/
├── ai/                           # Provider-agnostic boundary
│   ├── index.ts                  # generateItinerary(): timeout, validation, usage log
│   ├── providers/google.ts       # Gemini adapter via @ai-sdk/google
│   ├── prompt.ts                 # Prompt construction (bounded, size-capped)
│   └── usage-log.ts              # Token/cost metadata logging
├── domain/
│   ├── schema.ts                 # Zod: Trip, Day, Place (+ nullable roadmap fields)
│   ├── types.ts                  # Types inferred from Zod
│   └── board-ops.ts             # Pure functions: add/edit/delete/reorder/move + normalize
├── persistence/
│   ├── trip-repository.ts        # TripRepository interface
│   └── local-storage-repo.ts     # localStorage implementation
├── export/
│   └── trip-file.ts              # Versioned export/import (+ schemaVersion handling)
└── store/
    └── board-store.ts            # Zustand store wiring board-ops + repository

tests/
├── unit/                         # board-ops, schema parsing, export round-trip
├── integration/                  # store + repository, generate route (mocked AI)
├── e2e/                          # Playwright: generate→edit→reload→export→import
└── a11y/                         # axe on primary screens; keyboard DnD flows

docs/
└── adr/                          # ADR-0001..0004 (Phase 1)

.github/workflows/ci.yml          # typecheck · lint · test · axe · build
.env.example                      # GEMINI_MODEL, AI_REQUEST_TIMEOUT_MS, etc. (no secrets)
```

**Structure Decision**: Single Next.js App Router project (web application). The UI and its only
server surface (the `/api/generate` AI boundary) live in one deployable app — simplest structure
that satisfies the "privileged calls via a server boundary" constraint without a separate backend.
Domain logic (`lib/domain`), persistence (`lib/persistence`), and the AI boundary (`lib/ai`) are
isolated behind interfaces so they are independently testable and reversible.

## Phase 0 — Research

See [research.md](./research.md). All Technical Context items are resolved (no remaining NEEDS
CLARIFICATION). Headline findings: Gemini 2.5 deprecation (→ env-configured Gemini 3.x Flash
default); AI SDK `generateObject` + Zod is the structured-output path; dnd-kit for accessible DnD
with Pragmatic DnD noted as fallback; BYOK key-handling flow (on-device → server route → provider).

## Phase 1 — Design & Contracts

Generated artifacts:

- [data-model.md](./data-model.md) — `Trip`, `Day`, `Place/Activity` (with nullable roadmap fields),
  `GenerationRequest`, `TravelerSettings`; validation rules; normalization rules.
- [contracts/generate-itinerary.md](./contracts/generate-itinerary.md) — the `POST /api/generate`
  request/response/error contract (the AI boundary's public surface).
- [contracts/trip-export.schema.md](./contracts/trip-export.schema.md) — the versioned trip
  export/import file contract.
- [quickstart.md](./quickstart.md) — setup + runnable validation scenarios mapped to the spec's
  acceptance criteria.

**ADRs to author in `docs/adr/` during implementation setup:**

1. ADR-0001 — Next.js App Router as app shell + server AI boundary.
2. ADR-0002 — Vercel AI SDK with a provider-agnostic boundary; Gemini-first; model id as config.
3. ADR-0003 — dnd-kit for accessible Kanban drag-and-drop (Pragmatic DnD as fallback).
4. ADR-0004 — localStorage behind a `TripRepository` interface for local-first persistence.

**Post-Design Constitution re-check: PASS.** The design introduces no new complexity or violations;
all interfaces (AI boundary, repository) preserve reversibility (Principle VII) and forward
compatibility (Principle II).

## Complexity Tracking

> No constitution violations. No entries.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
