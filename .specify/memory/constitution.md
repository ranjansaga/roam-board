# Roam Board Constitution

Roam Board is a GenAI-assisted travel-planning web application. Its primary optimization is
**portfolio-first, product-capable**: craft, documentation, tests, and visible engineering
judgment win ties, and real usage is the proof that the engineering works. The direct audience of
this repository's artifacts is engineering managers and recruiters; the indirect audience is the
travelers who use the product. The v1 AI access model is bring-your-own-key (BYOK), with a
documented roadmap toward a public demo protected by guardrails.

## Core Principles

### I. Spec-Driven, Documented in the Open (NON-NEGOTIABLE)

- Feature implementation code MUST NOT be written before an approved spec (and plan) exists for
  that feature.
- The `.specify/` artifacts (constitution, specs, plans, tasks), Architecture Decision Records
  (ADRs), and a clean, readable git history are first-class deliverables — not afterthoughts.
  They are the portfolio shown to engineering managers and recruiters.
- Every pull request MUST reference the spec/feature it implements.

**Rationale**: The primary audience judges the thinking, not just the output. The artifacts are the
durable proof of engineering judgment, and keeping them clean is itself the deliverable.

### II. Vertical Slices on a Forward-Compatible Core

- Features MUST ship as thin, end-to-end vertical slices (data → API → UI), one Spec Kit feature
  at a time.
- The shared domain model (`Trip`, `Day`, `Place`/`Activity`) MUST anticipate roadmap features by
  carrying their fields as nullable/optional from the first slice — monetary cost, geographic
  coordinates, and accessibility metadata — even when the behavior that consumes them is not yet
  built.
- No previously shipped slice MAY require a breaking schema migration in order to add a later
  roadmap feature.

**Rationale**: This lets us spec and ship incrementally (itinerary + Kanban first, then budget,
map, weather, accessibility) without rework or painful migrations. It is the discipline that keeps
"slicing" from degrading into "hacking."

### III. Accessibility Is a Requirement, Not a Feature (WCAG 2.2 AA)

- Two senses are binding. **(a) UI conformance**: the interface MUST conform to WCAG 2.2 AA —
  full keyboard operability, visible focus states, sufficient color contrast, semantic HTML with
  ARIA only where needed, meaningful labels and alt text, and honoring `prefers-reduced-motion`.
  **(b) Domain modeling**: the product MUST model the real-world accessibility of places (e.g.,
  wheelchair / step-free access) in its data model and, when that feature ships, its UI.
- Sense (a) is a gate on every PR from Feature 001 onward. Sense (b)'s data fields MUST exist from
  Feature 001; its dedicated UI ships in a later feature.

**Rationale**: Accessibility is an ethical baseline and simultaneously the single strongest
differentiator for a portfolio, because most demos fail even basic accessibility.

### IV. AI Is Bounded, Observable, and Gracefully Degradable

- All LLM/GenAI calls MUST go through a single, provider-agnostic boundary module — no scattered
  direct API calls across the codebase.
- Every AI call MUST: enforce a timeout; validate and parse model output against an explicit schema
  before use; never be trusted as correct or safe without validation; and log token usage and
  estimated cost metadata.
- On AI failure, timeout, or unavailability, the app MUST remain usable for viewing and manually
  editing existing trips. AI is an enhancement, never a single point of total failure.
- The boundary MUST be designed for BYOK now and leave explicit seams for a server-held key, rate
  limiting, and caching later.

**Rationale**: Bounded, observable, degradable AI is the central piece of engineering judgment that
separates a credible product from a demo toy.

### V. Cost & Abuse Awareness by Design

- Even under BYOK, every generation MUST be treated as expensive: cache deterministic/repeatable
  requests, debounce and collapse duplicate in-flight requests, and cap request/prompt size.
- There MUST be no unbounded or recursive loops of AI calls.
- Clean, documented seams for per-identity rate limiting and a hard monthly cost ceiling (with
  graceful degradation) MUST exist, and MUST be active before any deployment that uses a
  server-held key.

**Rationale**: The roadmap goes public. Building the guardrail seams now is cheap; retrofitting
them under load is not.

### VI. Typed, Tested, Trustworthy

- Type safety MUST be end-to-end, from schema through API to UI; domain data MUST NOT cross
  untyped boundaries.
- Tests MUST target the risky seams — AI output parsing/validation, domain logic (e.g., budget
  math), and critical user flows — rather than chasing a blanket coverage percentage.
- Contract/integration tests at module boundaries are PREFERRED over brittle unit tests of trivial
  code.
- CI MUST pass (type check, lint, tests, and an automated accessibility check) before merge.

**Rationale**: Portfolio-first means quality must be visible and real. Judicious testing of the
seams is itself a senior-engineering signal; coverage theater is not.

### VII. Simplicity & Reversibility (YAGNI)

- Start with the simplest thing that satisfies the spec; add complexity only when a principle or a
  concrete, present requirement demands it.
- Prefer boring, well-understood, widely-adopted technology over novelty.
- Machinery for out-of-scope features (multi-city routing, real-time collaboration, booking /
  payments) MUST NOT be built until a spec requires it.
- Every nontrivial or hard-to-reverse decision MUST be recorded as a short ADR with context,
  decision, and consequences.

**Rationale**: Restraint and reversibility are the hardest and most senior signals to demonstrate.

## Technology Constraints

These are constraints, not product choices; concrete technology selections belong in each feature's
plan.

- The application is **web-first**.
- No secret or API keys MAY appear in client-side bundles. All privileged external calls (AI
  providers, paid map/geocoding/weather services) MUST go through a server-side boundary.
- Configuration MUST be provided via environment variables, with a committed `.env.example`
  documenting every required variable (and never a real secret).
- The application MUST be deployable to a low-cost or free hosting tier.
- Static-first rendering is PREFERRED where it does not compromise the experience.

## Development Workflow & Quality Gates

- Every change MUST trace to a spec/feature.
- Commit messages MUST follow a conventional-commit style for a readable history.
- CI gates are: type check + lint + tests + an automated accessibility check. All MUST pass before
  merge.
- Architecture-affecting changes MUST add or update an ADR.
- The constitution's principles MUST be checked at the `plan` and `analyze` stages.

## Governance

- This constitution supersedes other practices. Where a guideline conflicts with it, the
  constitution wins.
- Amendments MUST be made via a versioned change with written rationale and a version bump
  following semantic versioning:
  - **MAJOR**: a principle is removed or redefined, or an incompatible governance change is made.
  - **MINOR**: a new principle or section is added, or guidance is materially expanded.
  - **PATCH**: clarifications, wording, or typo fixes with no semantic change.
- Any added complexity MUST be justified against Principle VII (Simplicity & Reversibility).
- Agents and contributors MUST consult this constitution at the `plan` and `analyze` stages.

**Version**: 1.0.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-12
