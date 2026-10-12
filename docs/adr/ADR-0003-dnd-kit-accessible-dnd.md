# ADR-0003: dnd-kit for accessible Kanban drag-and-drop

- **Status**: Accepted
- **Date**: 2026-10-12

## Context

The board must be fully keyboard operable and screen-reader friendly (WCAG 2.2 AA, FR-014/FR-023).
Most drag-and-drop libraries are pointer-only.

## Decision

Use **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) for its keyboard sensor, screen-reader
announcements, and focus management. Always provide a non-DnD fallback (explicit move controls), and
honor `prefers-reduced-motion`.

## Consequences

- Keyboard + SR accessibility is first-class rather than bolted on.
- dnd-kit's maintenance cadence has slowed; `@atlaskit/pragmatic-drag-and-drop` is the documented
  fallback if needed. Our boards are tiny, so performance is a non-issue.
