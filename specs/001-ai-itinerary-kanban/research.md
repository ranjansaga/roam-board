# Phase 0 Research: AI Itinerary Generation + Kanban Board

**Date**: 2026-10-12 · **Feature**: `001-ai-itinerary-kanban`

All Technical Context items are resolved; no `NEEDS CLARIFICATION` remain. Each decision below is in
Decision / Rationale / Alternatives form.

---

## R1 — App framework & server boundary

- **Decision**: Next.js 16 (App Router) single app; the AI boundary is a server-only Route Handler
  (`app/api/generate/route.ts`). Deploy on Vercel free tier.
- **Rationale**: Satisfies the constitution's "privileged calls go through a server boundary" and "no
  secret keys in the client bundle" without a separate backend. Server Components give static-first
  rendering. Highest recognition with the portfolio audience. App Router has been stable since 13.4;
  current stable line is 16.3 (Aug 2026).
- **Alternatives**: Vite SPA + standalone serverless function (lighter, but hand-wired deploy + less
  recognition); Remix/React Router v7 (excellent fundamentals, smaller recognition footprint). Both
  viable; Next.js chosen for integration + recognition.

## R2 — GenAI integration layer

- **Decision**: Vercel AI SDK (`ai` v5 + `@ai-sdk/google`), using `generateObject` with a **Zod
  schema** for structured, validated itinerary output. Wrapped inside our own `lib/ai` boundary so
  both the SDK and the provider are swappable.
- **Rationale**: `generateObject` + Zod gives schema-validated output for free (Principle IV), plus a
  unified provider API so adding OpenAI/Anthropic later is an adapter, not a rewrite (the user's
  explicit "provider-agnostic, easily extendable" requirement). Native fit with Next.js Route
  Handlers; exposes token usage for cost logging.
- **Alternatives**: **CopilotKit** — a framework for in-app *chat copilots*; overkill for
  form→structured-itinerary, but a strong candidate for the **later conversational-editing feature**.
  Direct `@google/genai` SDK — Google-only, would require hand-rolling the provider-agnostic layer.
  LangChain.js — heavy/churny for a single structured call (YAGNI).

## R3 — Gemini model selection (TIME-SENSITIVE)

- **Decision**: The model id is an **environment-configured value** (`GEMINI_MODEL`), never a
  hardcoded constant. Default to a current **Gemini 3.x Flash-class** model (cost-appropriate for
  BYOK); confirm the exact id against Google's live model list at implementation time.
- **Rationale**: The **Gemini 2.5 line is scheduled for shutdown on 2026-10-16** — days from this
  plan's date. Hardcoding a 2.5 model would break the app almost immediately. Making the model id
  configuration also serves Principle V (cost control: a cheaper Flash/Flash-Lite can be selected)
  and Principle VII (reversibility). As of research, candidate 3.x models include Gemini 3 Flash
  Preview (~$0.50/$3.00 per 1M tok), Gemini 3.1 Flash-Lite (~$0.25/$1.50), and Gemini 3.5 Flash
  (~$1.50/$9.00); exact pricing/ids are provider-controlled and must be re-verified at build time.
- **Alternatives**: Pinning a specific model (rejected — deprecation churn); Gemini 2.5 Flash
  (rejected — shutting down 2026-10-16).

## R4 — BYOK key handling

- **Decision**: The traveler's Gemini key is stored on-device (`TravelerSettings` in localStorage)
  and sent **per request** to `/api/generate`; the server route uses it to call Gemini and then
  discards it. The key is never embedded in the client bundle and never persisted server-side.
- **Rationale**: Keeps a single AI boundary (Principle IV) and leaves a clean seam to later switch to
  a server-held key + per-identity rate limiting + response caching + hard cost cap (Principle V)
  without changing callers. Sending the key over HTTPS to our own route (vs. calling Google directly
  from the browser) means one choke point for timeout, validation, logging, and future guardrails.
- **Alternatives**: Call Google directly from the browser with the user's key (rejected — bypasses
  the single boundary and the future-guardrail seam, and scatters AI logic client-side). Server-held
  key now (rejected — that is the later public-demo phase, not v1 BYOK).

## R5 — Accessible Kanban drag-and-drop

- **Decision**: dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) with its keyboard sensor and
  screen-reader announcements. Honor `prefers-reduced-motion`. Always provide a non-DnD fallback
  (explicit "move to day / move up / move down" controls) so reordering never depends on drag alone.
- **Rationale**: Most DnD libraries are not keyboard accessible; dnd-kit ships a keyboard sensor,
  live-region announcements, and focus management — directly supporting FR-014/FR-023 and WCAG 2.2
  AA. It is the dominant React DnD library (~2.8M weekly downloads) at v6.3.1. Our boards are tiny
  (≤ 7 × ~6), so performance is a non-issue.
- **Alternatives**: `@atlaskit/pragmatic-drag-and-drop` (active, excellent at large scale; kept as a
  **fallback** if dnd-kit's slowed maintenance cadence becomes a problem). `react-beautiful-dnd`
  (rejected — deprecated/unmaintained since 2022). Hand-rolled DnD (rejected — a11y is too easy to
  get wrong).

## R6 — Local-first persistence

- **Decision**: `TripRepository` interface implemented over `localStorage` (`LocalStorageTripRepo`).
  All callers depend on the interface, never on `localStorage` directly.
- **Rationale**: Simplest thing that works for small JSON trips (Principle VII); the interface makes a
  later swap to IndexedDB a one-file change that doesn't touch callers (Principle II). Guard every
  read/write in try/catch and surface a clear "may not persist" warning when storage is unavailable
  (private browsing, quota).
- **Alternatives**: IndexedDB (Dexie/`idb`) now (rejected for v1 — more async complexity than small
  trips need; still reachable behind the same interface). Ephemeral in-memory (rejected — spec
  requires survival across reloads).

## R7 — Validation, types, and state

- **Decision**: Zod schemas in `lib/domain/schema.ts` are the single source of truth; TS types are
  inferred from them (`z.infer`). Board mutations are **pure functions** in `lib/domain/board-ops.ts`
  and wired into a small Zustand store.
- **Rationale**: One schema → types → API validation → AI-output validation (Principle VI). Pure
  board-ops are trivially unit-testable (the risky domain seam) independent of React/DnD.
- **Alternatives**: Separate type + validator definitions (rejected — drift risk). Redux/large state
  libs (rejected — YAGNI for a single board). Raw React state (viable; Zustand chosen for testability
  and clean DnD reordering).

## R8 — Testing & CI gates

- **Decision**: Vitest + React Testing Library (unit/integration), Playwright (critical E2E), and
  axe (via `jest-axe` for components and Playwright's axe integration for pages). CI (GitHub Actions)
  runs typecheck + lint + test + axe + build and must pass before merge.
- **Rationale**: Directly implements Principle VI (test the risky seams: AI parsing, board-ops,
  export round-trip, critical flows) and the constitution's required a11y CI gate (Principle III).
- **Alternatives**: Jest (fine; Vitest chosen for speed/Vite alignment). Cypress (Playwright chosen
  for breadth + first-class axe support). Coverage-percentage gate (rejected per constitution —
  seam-focused, not coverage theater).

## R9 — End-to-end data flow (LLM → rendered board)

> **Core principle: the LLM emits schema-validated *data*, never UI/markup. React draws the board
> from that data.** The "LLM → UI" step is really `LLM → validated JSON → domain objects →
> components`, with validation at each trust boundary (client→server, and model→server).

**Generation pipeline (one-shot, when the traveler clicks Generate):**

1. **Form → `GenerationRequest`** — client assembles inputs and Zod-validates them for instant UX
   feedback (not for trust).
2. **POST `/api/generate`** — `{ request, apiKey, model }`. The BYOK key leaves the device only here,
   to our own server over HTTPS (never to the provider directly from the browser). This is the single
   AI boundary (Principle IV) and the future guardrail seam (Principle V).
3. **Server re-validates** the request with the *same* Zod schema (the client is untrusted; this is
   the Principle V request-size/abuse cap). Reject → `400`.
4. **Build a bounded prompt** — user free-text is length-capped and slotted into our template; the
   prompt restates the constraints that mirror the schema (exact day count, ≤6/day, fixed category
   enum, day-part values).
5. **`generateObject({ schema })`** — the AI SDK converts the Zod schema to JSON Schema, calls Gemini
   in structured-output/JSON mode, under a hard timeout. The provider is instantiated per-request with
   the BYOK key (`createGoogleGenerativeAI({ apiKey })`).
6. **Validate model output** — the SDK `JSON.parse`s then Zod-validates the result; non-conforming
   output throws → mapped to `422 unusable_output`. A half-formed board is never rendered (SC-007).
   This is the model→server trust boundary (twin of step 3).
7. **Normalize** — enforce invariants and own identity: force exact day count, assign `id`s + `order`,
   coerce unknown categories → `"other"`, trim to ~6/day, set nullable `cost/coordinates/accessibility`
   (Principle II). Output is our canonical, provider-independent shape.
8. **Return `{ itinerary, usage }`** and log `usage` (tokens → est. cost — Principle IV observability).
9. **Client → domain → store → disk** — wrap the itinerary into a full `Trip`, load into the Zustand
   store (UI source of truth), persist via `TripRepository` (localStorage; swappable — Principle II).
10. **`<KanbanBoard>` renders** — a pure function of store state: `days.map → DayColumn`,
    `places.map → PlaceCard`, with dnd-kit adding pointer **and** keyboard interaction (Principle III).

**Two runtime loops over the same store** (the key mental model):

- **Generation loop (AI, one-shot):** form → `/api/generate` → validated data → store → render. Seeds
  the store once.
- **Editing loop (manual, no AI, runs forever after):** user gesture → pure `board-ops`
  (add/edit/delete/reorder/move) → store → render + persist. dnd-kit's `onDragEnd` calls the same
  `board-ops`. This is why the app stays fully usable with no key or after any AI failure (Principle
  IV graceful degradation).

When the later conversational-editing feature arrives, CopilotKit (or AI-SDK tool-calls) becomes a
**third driver of the same `board-ops`** — no rewrite (Principle II across features).

**Enhancement noted for later:** the AI SDK's `streamObject` can stream the itinerary as it generates,
so days/cards appear progressively instead of after a full wait — a strong "dynamic GenAI" feel.
Feature 001's contract uses one-shot `generateObject`; `streamObject` is a low-risk later upgrade.

> **TODO (later):** turn this pipeline and the two-loops model into theme-adaptive SVG diagrams for the
> portfolio write-up (deferred by decision on 2026-10-12).

---

## Sources

- Gemini pricing / deprecation: [finout.io](https://www.finout.io/blog/gemini-pricing-in-2026) · [eesel.ai](https://eesel.ai/blog/gemini-pricing) · [cloudzero.com](https://www.cloudzero.com/blog/gemini-pricing/) (third-party; **verify ids/pricing/deprecation in Google AI Studio before pinning**)
- Vercel AI SDK Google provider: [@ai-sdk/google on socket.dev](https://socket.dev/npm/package/@ai-sdk/google/overview/4.0.28) · [AI SDK guide](https://www.codecademy.com/article/guide-to-vercels-ai-sdk)
- DnD libraries: [dnd-kit vs pragmatic drag-and-drop comparison](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026) · [@dnd-kit/core advisor](https://dev.snyk.io/advisor/npm-package/@dnd-kit/core)
- Next.js version: [Next.js blog](https://nextjs.org/blog)
