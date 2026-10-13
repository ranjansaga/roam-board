---

description: "Task list for Feature 001 — AI Itinerary Generation + Kanban Board"
---

# Tasks: AI Itinerary Generation + Kanban Board

**Input**: Design documents from `specs/001-ai-itinerary-kanban/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED and REQUIRED — the constitution (Principle VI + CI gates) mandates tests on the
risky seams (AI parsing/normalization, board-ops, export round-trip, critical flows) and an automated
accessibility check. Test tasks are first-class, not optional, for this feature.

**Organization**: Tasks are grouped by user story (US1 P1, US2 P2, US3 P3) so each can be built,
tested, and demoed independently. MVP = US1. (Revised after `/speckit-analyze`: the read-only board
display moved to Foundational so US2 is independent of US1; the ~6/day "soft cap" is now an enforced
cap; an explicit no-server-persistence/no-key-log assertion was added.)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (only on user-story-phase tasks)

## Path Conventions

Single Next.js App Router app at repo root: `app/`, `components/`, `lib/`, `tests/`, `docs/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling.

- [x] T001 Initialize Next.js 16 (App Router) + TypeScript (strict) project with pnpm at repo root; create the `app/`, `components/`, `lib/`, `tests/`, `docs/` structure per plan.md
- [x] T002 [P] Add and configure Tailwind CSS in `app/globals.css` with design tokens for light/dark (`:root`, `prefers-color-scheme`, `[data-theme]`) and a `prefers-reduced-motion` base
- [x] T003 [P] Install and initialize shadcn/ui (Radix primitives) into `components/ui/`
- [x] T004 [P] Install core dependencies: `zod`, `ai`, `@ai-sdk/google`, `@dnd-kit/core`, `@dnd-kit/sortable`, `zustand` (pin exact versions; verify current at install — AI SDK + Gemini model id per research.md R3)
- [x] T005 [P] Configure ESLint + Prettier + strict `tsconfig.json`; add pnpm scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:a11y`, `test:e2e`
- [x] T006 [P] Set up test tooling: Vitest + React Testing Library + `jest-axe`; Playwright with its axe integration; base configs + one smoke test in `tests/unit/smoke.test.ts`
- [x] T007 [P] Create `.env.example` with `GEMINI_MODEL` (default a current Gemini 3.x Flash id; NOTE Gemini 2.5 shuts down 2026-10-16) and `AI_REQUEST_TIMEOUT_MS=30000` — NO secrets
- [x] T008 [P] Add GitHub Actions CI in `.github/workflows/ci.yml`: `typecheck` + `lint` + `test` + `test:a11y` + `build` (constitution-required gates)
- [x] T009 [P] Write `docs/adr/ADR-0001..0004.md`: Next.js App Router; Vercel AI SDK provider-agnostic boundary (Gemini-first, model id as config); dnd-kit for accessible DnD; localStorage-behind-`TripRepository`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain, persistence, store, app shell, AND the read-only board display that ALL user
stories depend on.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T010 Define Zod domain schemas in `lib/domain/schema.ts`: `PlaceCategory` enum (`food|sightseeing|outdoors|culture|nightlife|shopping|transit|accommodation|other`), `DayPart` (`morning|afternoon|evening`), `Pace` (`relaxed|balanced|packed`); `Place` (name 1–120, description 0–600, category from set, dayPart, order ≥0, **nullable** `cost`/`coordinates`/`accessibility` per FR-025); `Day` (index ≥0, label, nullable date, places[]); `Trip` (**days length 1–7**, title 1–120, destination 1–120, source `ai|manual`, timestamps); `GenerationRequest` (days 1–7, interests ≤10 × ≤40 chars); `TravelerSettings`
- [x] T011 [P] Export inferred TypeScript types (`z.infer`) in `lib/domain/types.ts`
- [x] T012 [P] Define `TripRepository` interface in `lib/persistence/trip-repository.ts` (save, get, list, delete)
- [x] T013 Implement `LocalStorageTripRepository` in `lib/persistence/local-storage-repo.ts` with try/catch on every access and a "may not persist" warning when storage is unavailable; supports multiple trips (depends on T010–T012)
- [x] T014 Create the Zustand store in `lib/store/board-store.ts` holding current trip + trip list, with `loadTrip`/`setCurrentTrip` wired to the repository (depends on T012, T013)
- [x] T015 [P] Build the app shell: `app/layout.tsx` with semantic landmarks, a skip-link, theme tokens, and global focus-visible + reduced-motion styles
- [x] T016 [P] Implement `TravelerSettings` local accessor in `lib/persistence/settings.ts` for the BYOK key, model override, and reducedMotion flag (never sent anywhere but `/api/generate`)
- [x] T017 [P] Build the read-only board DISPLAY components in `components/board/` — `KanbanBoard.tsx`, `DayColumn.tsx`, `PlaceCard.tsx` — rendering from the store with semantic HTML and labelled regions (no interaction yet; shared by US1 view and US2 editing)

**Checkpoint**: Foundation ready — user stories can begin and are mutually independent.

---

## Phase 3: User Story 1 — Generate a day-by-day plan (Priority: P1) 🎯 MVP

**Goal**: A traveler with a Gemini key turns destination + length (+ optional prefs) into a rendered
multi-day board in one generation.

**Independent Test**: With a (mocked in tests) key, submit "Lisbon / 4 days" → a 4-column board of
categorized, described cards appears (rendered by the Foundational board display).

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [x] T018 [P] [US1] Unit test `GenerationRequest` validation (days 1–7, interests ≤10 × ≤40 chars, required destination) in `tests/unit/generation-request.test.ts`
- [x] T019 [P] [US1] Unit test AI validate+normalize: wrong day count forced to requested (pad/trim), unknown category → `other`, **cap at 6 items/day (overflow trimmed)**, ids + order assigned, nullable roadmap fields set `null` in `tests/unit/normalize.test.ts`
- [x] T020 [P] [US1] Integration test `POST /api/generate` with mocked AI: 200 success, 400 invalid_request, 401 missing_key, 422 unusable_output, timeout path — AND assert the API key is never logged and no trip is persisted server-side (FR-009, FR-022) — in `tests/integration/generate-route.test.ts`
- [x] T021 [P] [US1] E2E (stubbed AI): enter destination + days → board renders with cards in `tests/e2e/generate.spec.ts`

### Implementation for User Story 1

- [x] T022 [US1] Implement bounded prompt builder in `lib/ai/prompt.ts` (caps free-text; restates day count, max 6/day, category enum, day-parts)
- [x] T023 [US1] Implement Gemini adapter in `lib/ai/providers/google.ts` using `createGoogleGenerativeAI({ apiKey })` per-request; model from request/env default
- [x] T024 [US1] Implement `lib/ai/usage-log.ts` to log token/cost metadata — and NEVER log the API key
- [x] T025 [US1] Implement `lib/ai/index.ts` `generateItinerary()`: hard timeout via `AbortSignal`, `generateObject` with the Zod schema, then validate + normalize (depends on T010, T022–T024)
- [x] T026 [US1] Implement `app/api/generate/route.ts` (server-only): re-validate request (days 1–7, size caps), collapse duplicate in-flight requests, call `lib/ai`, map errors to the contract's status/codes, never log the key or persist trips (depends on T025)
- [x] T027 [P] [US1] Build the trip-creation form in `components/trip-form/` (inputs + client-side Zod validation + submit)
- [x] T028 [P] [US1] Build the settings UI in `components/settings/` (BYOK key entry, "no key configured" state per FR-010, optional model override) using `lib/persistence/settings.ts`
- [x] T029 [US1] Wire the generate flow: form submit → `fetch('/api/generate')` → `buildTrip` → `store.loadTrip` → the Foundational board renders; progress + non-technical error/degradation states (depends on T026, T027, T017, T014)
- [x] T030 [US1] Add routes `app/page.tsx` (entry) and `app/trips/[tripId]/page.tsx` (board view) (depends on T017, T029)

**Checkpoint**: US1 is independently demoable — generate and view a plan. (Persistence/editing come next.)

---

## Phase 4: User Story 2 — Arrange and edit by hand (Priority: P2)

**Goal**: The traveler edits the board directly (add/edit/delete/reorder/move, add/remove days) via
pointer AND keyboard — including building a trip with no AI key.

**Independent Test**: From an empty or imported trip (no US1 needed), add/edit/delete a card and move
it across days using keyboard only; build a full trip with no key.

### Tests for User Story 2 ⚠️

- [x] T031 [P] [US2] Unit tests for pure board-ops (addPlace, editPlace, deletePlace, reorderWithinDay, moveAcrossDays, addDay, removeDay; order + day-index re-normalized) in `tests/unit/board-ops.test.ts`
- [x] T032 [P] [US2] E2E keyboard-only DnD: focus a card, pick up, move to another day, drop in `tests/e2e/keyboard-dnd.spec.ts`
- [x] T033 [P] [US2] A11y test: axe on the board (idle and mid-interaction) in `tests/a11y/board.a11y.test.ts`
- [x] T034 [P] [US2] E2E: build a complete trip manually with NO key configured in `tests/e2e/manual-no-key.spec.ts`

### Implementation for User Story 2

- [x] T035 [US2] Implement pure board-ops in `lib/domain/board-ops.ts` (all mutations; re-normalize `order` per day and contiguous `Day.index`)
- [x] T036 [US2] Extend the store with mutation actions wrapping board-ops, persist-on-change via repository, and `updatedAt` bump (depends on T035, T014)
- [x] T037 [US2] Add interaction to the board with dnd-kit: `DndContext` + `SortableContext` + PointerSensor + KeyboardSensor + screen-reader announcements, layered onto the Foundational board display (depends on T017, T036)
- [x] T038 [US2] Make `PlaceCard` interactive (edit via dialog/inline, delete) and `DayColumn` add-card — all keyboard-accessible (depends on T037)
- [x] T039 [US2] Add non-DnD fallback move controls (move up/down, move-to-day) for full keyboard parity (depends on T038)
- [x] T040 [US2] Add/remove-day controls wired to board-ops (depends on T036)
- [x] T041 [US2] Add "new empty trip (no AI)" entry from the home page (depends on T014, T017)
- [x] T042 [US2] Honor `prefers-reduced-motion` / `settings.reducedMotion` in DnD animations (depends on T037)

**Checkpoint**: US1 + US2 both work — generate OR build by hand, then edit fully by keyboard/pointer.

---

## Phase 5: User Story 3 — Keep, share, and move a trip (Priority: P3)

**Goal**: Trips persist across reloads, multiple trips are listed, and a trip exports/imports as a
versioned file with no server.

**Independent Test**: Create a trip, reload → still there; export → import into a clean session →
identical trip.

### Tests for User Story 3 ⚠️

- [x] T043 [P] [US3] Unit: export → import round-trip is faithful (days, cards, order, fields) in `tests/unit/export-roundtrip.test.ts`
- [x] T044 [P] [US3] Unit: import rejects malformed JSON and unknown/newer `schemaVersion` WITHOUT corrupting existing trips in `tests/unit/import-validation.test.ts`
- [x] T045 [P] [US3] E2E: create a trip, reload → present; create several → all listed/openable in `tests/e2e/persistence.spec.ts`
- [x] T046 [P] [US3] E2E: export a trip, import into a clean session → reproduced in `tests/e2e/export-import.spec.ts`

### Implementation for User Story 3

- [x] T047 [US3] Implement `lib/export/trip-file.ts`: JSON backup with `schemaVersion: 1` + `exportedAt`; import parse → validate → migrate/reject per `contracts/trip-export.schema.md`; and `lib/export/trip-text.ts` `tripToText()` producing human-readable Markdown (FR-030) (depends on T010)
- [x] T048 [US3] Ensure persistence is wired end-to-end: generated AND manually edited trips save via repository and reload on revisit (depends on T013, T014, T036)
- [x] T049 [P] [US3] Build the trip list on the home page: view, open, delete multiple saved trips (depends on T014)
- [x] T050 [US3] Add UI controls: "Copy as text" (FR-030), "Back up / transfer" (download JSON), and "Import" (upload + validate with clear, non-corrupting error messages) (depends on T047, T049)

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T051 [P] Write `README.md`: run instructions, BYOK setup, and an architecture overview linking the `research.md` data-flow section
- [ ] T052 [P] Security pass: confirm the API key is never logged or persisted server-side; `.env.example` holds no secrets; sensible response headers
- [ ] T053 Performance pass: board interactions reflect in < 100 ms; confirm static-first rendering
- [ ] T054 [P] Accessibility sweep against WCAG 2.2 AA: focus management, labels/alt text, color-contrast tokens, reduced-motion
- [ ] T055 Run all 15 `quickstart.md` validation scenarios and fix any gaps
- [ ] T056 Confirm CI is green (typecheck + lint + test + axe + build)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup — BLOCKS all user stories. Now includes the read-only board display (T017).
- **User Stories (Phases 3–5)**: each depends only on Foundational; then fully independent (parallel or sequential P1→P2→P3).
- **Polish (Phase 6)**: after the stories you intend to ship.

### User Story Dependencies

- **US1 (P1)**: after Foundational. No dependency on US2/US3. Renders via the Foundational board (T017). *(Reload persistence is US3; US1 alone is in-memory + render.)*
- **US2 (P2)**: after Foundational. Layers interaction onto the Foundational board (T017) — **independent of US1** (testable on an empty/imported trip).
- **US3 (P3)**: after Foundational. Persists/exports whatever trips exist; independently testable. (Edit-persistence of manual changes also relies on US2's T036 — expected under P1→P2→P3 order.)

### Within Each User Story

- Tests written first and failing → models → services → endpoints/UI → integration.

### Parallel Opportunities

- Setup: T002–T009 are all `[P]`.
- Foundational: T011, T012, T015, T016, T017 are `[P]` (T013→T014 are sequential on the domain/repo).
- US1 tests T018–T021 `[P]`; US1 UI T027/T028 `[P]`.
- US2 tests T031–T034 `[P]`. US3 tests T043–T046 `[P]`.
- With a team: once Foundational is done, US1/US2/US3 can proceed in parallel.

---

## Parallel Example: User Story 1

```bash
# Tests first (all parallel):
Task: "Unit test GenerationRequest validation in tests/unit/generation-request.test.ts"
Task: "Unit test AI validate+normalize in tests/unit/normalize.test.ts"
Task: "Integration test POST /api/generate (mocked AI) in tests/integration/generate-route.test.ts"
Task: "E2E generate → board renders in tests/e2e/generate.spec.ts"

# Then US1 UI in parallel (board display already exists from Foundational T017):
Task: "Trip-creation form in components/trip-form/"
Task: "Settings / BYOK key UI in components/settings/"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & validate** (generate + view a
plan) → demo-able MVP.

### Incremental Delivery

Foundation → US1 (generate+view, MVP) → US2 (edit) → US3 (persist/share). Each adds value without
breaking the previous.

---

## Notes

- `[P]` = different files, no incomplete-task dependency.
- Tests are required here (constitution Principle VI + CI gate) — verify they fail before implementing.
- Commit after each task or logical group, conventional-commit style (Principle I; clean portfolio history).
- Each story has a checkpoint — stop and validate independently.
- Watch the AI boundary invariants: timeout, Zod validation, usage logging, key never logged/stored (Principles IV & V).
