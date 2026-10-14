# Roam Board — Blog Plan

> **Audience of the blog:** engineering managers, recruiters, and engineers.
> This file is the working build sheet for the write-up; it is not the article itself.

## Spine: a two-part series

Split on the **interaction paradigm**, not a library name:

- **Part 1 — "Roam Board as a structured tool"** — write now; stands alone.
- **Part 2 — "Giving it an AI copilot"** — when conversational editing ships (CopilotKit _or_ AI-SDK tool-calling).

A thin **anchor / overview** sits on top: one-liner, hero GIF, live-demo + repo links, a 5-bullet TL;DR, and links to both parts.

---

## Part 1 — structure (a narrative, not a topic list)

Follow **one user journey** — _sentence → plan → make it yours → keep & share_ — which maps 1:1 to the vertical slices **US1 / US2 / US3**. Each act surfaces one hard problem; an SDD lens and a "forward-compatible core" thread tie them together.

| Section | Beats | Pulls from |
|---|---|---|
| **Hook** | What it is (GIF + live link). The **central tension**: building on a flaky, pricey, non-deterministic LLM yet shipping something solid, trustworthy, and usable by everyone. Thesis: _spec-first + AI as a bounded, swappable dependency._ | screenshots, live demo |
| **Act 0 · Decide before coding** | SDD in ~4 sentences + **one proof it paid off** (`/clarify` caught the JSON-export UX miss). The lens for everything below. | `.specify/memory/constitution.md`, `specs/001-ai-itinerary-kanban/`, the "refine US3 export" commit |
| **Act 1 · "Turn a sentence into a plan"** (the AI problem) | Single bounded boundary · Zod-validated structured output · BYOK · graceful degradation · **war story: Gemini model churn** → payoff _"model id is config, each fix one commit."_ | `lib/ai/*`, `docs/adr/ADR-0002`, the `fix:` commits, `contracts/generate-itinerary.md` |
| **Act 2 · "Make it yours"** (the interaction problem) | Accessible Kanban: keyboard sensor **+ the non-drag alternative (WCAG 2.2 §2.5.7)** · live announcements · axe in CI. **Verified: Lighthouse a11y 100/100 + a keyboard-only move demo.** | `components/board/*`, `tests/a11y`, `tests/e2e/keyboard-dnd`, Constitution Principle III |
| **Act 3 · "Keep it, share it"** (the portability problem) | Local-first · the **export rethink** (JSON = backup vs human-readable _copy-as-text_) — "I questioned my own spec." | `lib/export/*`, FR-029 / FR-030, `tests/e2e/export-import` |
| **The thread · "A core built for tomorrow"** | `Trip/Day/Place` + pure `board-ops` as the shared spine; _"the LLM emits data, React draws the board."_ Intellectual payoff **and** the bridge: Part 2's copilot becomes a 3rd driver of the same ops. | `data-model.md`, `research.md` R9, `lib/domain/board-ops.ts`, the diagram |
| **Close** | Evidence (typecheck · lint · 36 tests · 5 e2e · a11y · CI; clean commit history) → **tease Part 2**. | repo, CI |

**Voice:** war stories live _inside_ their act (model churn in Act 1, export rethink in Act 3). Link _into_ the repo; don't duplicate it.

---

## Part 2 — outline (future, brief)

The structured → conversational pivot: expose `board-ops` as AI-callable actions, in-chat generative UI, and the payoff that Part 1's seams (pure ops, single AI boundary) made it a clean _addition, not a rewrite_. Plus roadmap features 002–005 (budget / map / weather / accessibility) living on the structured side.

---

## Accessibility (the spine of Act 2) — what to assert

- **WCAG 2.2 AA**, specifically the **new §2.5.7 Dragging Movements** — the ↑/↓ + "Move to day" controls are the required non-drag alternative for a Kanban. (The precise, credible detail.)
- Screen-reader structure (regions / headings / labels), keyboard parity (two paths), live announcements, visible focus, reduced-motion.
- **Verified:** Lighthouse Accessibility **100/100** (0 failures) + a keyboard-only reorder demo on the live board.

---

## Pending to make Part 1 "blog-ready"

_(GitHub push + Vercel deploy excluded — handled separately.)_

| # | Item | Status |
|---|---|---|
| 1 | a11y sweep | **mostly done** (Lighthouse 100 + keyboard verified); remaining: **target size ≥24px (§2.5.8)** + a **VoiceOver pass** |
| 2 | Security + quickstart pass (key never logged/stored; 15 scenarios) | pending (T052, T055) |
| 3 | README anchor · perf pass · CI green | pending (T051, T053, T056) |
| 4 | Visual assets: screenshots/GIF + **architecture / data-flow diagram** | pending |
| 5 | Write the anchor + Part 1 prose | pending |

**Not needed for Part 1:** Features 002–005 and CopilotKit (Part 2 / roadmap).

---

## Recommended sequence

1. Close the two a11y gaps (target-size + VoiceOver) → AA claim airtight.
2. Security + quickstart + perf + README + confirm CI → Phase 6 done.
3. Capture screenshots/GIF + the architecture diagram.
4. Push to GitHub + deploy to Vercel → live link.
5. Draft **Act 1** first (strongest story), then fill the rest.
