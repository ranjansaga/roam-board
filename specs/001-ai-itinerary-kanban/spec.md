# Feature Specification: AI Itinerary Generation + Kanban Board

**Feature Branch**: `001-ai-itinerary-kanban`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "A traveler describes a trip; Roam Board uses AI to generate a structured, multi-day itinerary they can arrange and refine on a visual Kanban board (one column per day, cards per place/activity). AI generates the first draft only; all edits are manual. Local-first, no accounts; trips persist on-device and can be exported/imported. Bring-your-own-key for AI; the app stays fully usable without AI. Fully accessible (WCAG 2.2 AA)."

## Clarifications

### Session 2026-10-12

- Q: How should a trip be shared or moved between devices/people in v1? → A: File export/import **only** — no share link and no server-side storage. The export is a single self-contained, **versioned**, human-readable file (intended encoding: JSON) that captures the complete trip and re-imports faithfully.
- Q: Should each card's category come from a fixed set or be free-form? → A: A **fixed set** — Food, Sightseeing, Outdoors, Culture, Nightlife, Shopping, Transit, Accommodation — plus **Other** as an escape hatch.
- Q: What are the trip-length bounds for v1 generation? → A: **1–7 days**, with a soft cap of about **6** place/activity items per day.
- Q: How should a card's timing be represented? → A: A structured **day-part** (Morning / Afternoon / Evening) plus an explicit **order index** within its day.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a day-by-day plan from a short description (Priority: P1)

A traveler who has configured their own AI key enters where they are going, for how long, and what they care about, and within seconds receives a structured multi-day itinerary laid out as a board — one column per day, with a card for each place or activity.

**Why this priority**: This is the core value proposition and the headline differentiator — turning a sentence into a credible first draft. Without it, the product is just a manual planner. It is the smallest slice that demonstrates the product's reason to exist.

**Independent Test**: With a valid AI key configured, enter destination + length (plus optional interests/pace), trigger generation, and confirm a multi-day board appears with ordered, categorized cards per day. Delivers value even before editing or saving exist.

**Acceptance Scenarios**:

1. **Given** a valid AI key is configured and no trip exists, **When** the traveler submits destination "Lisbon" and length "4 days", **Then** a 4-column board is produced with each day containing at least one ordered place/activity card showing a name, a short description, and a category.
2. **Given** the traveler adds interests ("food", "history") and pace ("relaxed"), **When** they generate, **Then** the produced plan reflects those preferences (e.g., fewer activities per day for a relaxed pace; cards skewed toward the chosen interests).
3. **Given** only the minimum inputs (destination + length) are provided, **When** the traveler generates, **Then** a plan is still produced using sensible defaults for the unspecified preferences.
4. **Given** generation is in progress, **When** the traveler waits, **Then** they see a clear progress indication and the interface remains responsive (not frozen or broken).

---

### User Story 2 - Arrange and edit the plan by hand on the board (Priority: P2)

A traveler refines a plan — whether AI-generated or started from scratch — by directly manipulating the board: adding, editing, and deleting cards, reordering cards within a day, and moving cards between days. This journey also covers travelers with no AI key, who build a plan entirely by hand.

**Why this priority**: Direct control is what the target user wants after the first draft, and it is the graceful-degradation path the product requires (the app must be fully usable without AI). On its own it is a standalone manual trip planner, making it an independently valuable slice.

**Independent Test**: Starting from either a generated plan or an empty trip, add a card, edit its fields, reorder it within a day, move it to another day, and delete it — using both pointer (drag) and keyboard alone — and confirm the board reflects each change immediately.

**Acceptance Scenarios**:

1. **Given** a board with cards, **When** the traveler drags a card to a different day, **Then** the card moves to that day and ordering updates immediately.
2. **Given** a board with cards, **When** the traveler uses only the keyboard to pick up, move, and drop a card onto another day, **Then** the same move succeeds without any pointer use.
3. **Given** any day, **When** the traveler adds a new card and fills in its name, description, category, and time/order, **Then** the card appears in that day in the chosen position.
4. **Given** a card, **When** the traveler edits or deletes it, **Then** the change is reflected immediately and no other cards are affected.
5. **Given** no AI key is configured, **When** the traveler creates a new trip, **Then** they can still add days and cards and build a complete plan manually.

---

### User Story 3 - Keep, share, and move a trip (Priority: P3)

A traveler's trip persists on their own device between visits, and can be exported and re-imported (and/or shared) so it can be reopened later, on another device, or by another person — with no account and no server-side storage of the trip.

**Why this priority**: Persistence turns a one-off demo into something people actually plan with and return to; portability enables sharing without accounts. It is valuable but depends on there being a trip to keep, so it ranks after generation and editing.

**Independent Test**: Create or generate a trip, reload the page, and confirm it is still present and unchanged. Then export the trip, import it into a fresh session, and confirm it is faithfully reproduced.

**Acceptance Scenarios**:

1. **Given** a trip exists, **When** the traveler reloads or revisits later in the same browser on the same device, **Then** the trip is still present with all days and cards intact.
2. **Given** a trip exists, **When** the traveler exports it and then imports that export into a clean session, **Then** the reconstructed trip matches the original in days, cards, ordering, and all card fields.
3. **Given** a traveler has multiple trips, **When** they return, **Then** they can see and open each of their saved trips.
4. **Given** an exported/shared trip from another person or device, **When** the traveler imports it, **Then** it opens as their own editable copy without requiring any account.

---

### Edge Cases

- **No AI key + generate**: generation is unavailable with a clear, non-technical explanation and a prompt to add a key; manual planning stays fully available.
- **Generation fails, times out, or returns malformed/unusable output**: the traveler sees a clear error, the app stays usable, they can retry or continue manually, and no partial or broken board is left behind.
- **AI returns more/fewer days than requested, or empty days**: the plan is normalized to the requested number of days; empty days are allowed and clearly shown rather than silently dropped.
- **Very long trips or very large generated plans**: trip length is bounded (see Assumptions) and the board stays usable and scrollable.
- **Local storage unavailable, full, or cleared (e.g., private browsing)**: the traveler is warned that their trip may not persist; the in-session experience still works.
- **Malformed, truncated, or incompatible import**: import is rejected with a clear message and the current trip is not corrupted.
- **Import from a different schema version**: a file whose schema version is recognized is imported (migrated if needed); an unrecognized or newer version is rejected with a clear message rather than silently mis-importing.
- **Ambiguous, nonsensical, or non-existent destination**: the system responds gracefully (asks for a clearer destination or produces a best-effort plan with a caveat) rather than failing silently.
- **Reduced-motion preference set**: drag/reorder motion is minimized or removed while all interactions still work.
- **Duplicate or rapid repeat generation requests**: repeat/identical in-flight requests are collapsed or prevented rather than multiplied.

## Requirements *(mandatory)*

### Functional Requirements

**Generation (P1)**

- **FR-001**: System MUST let a traveler request a multi-day itinerary by providing at minimum a destination and a trip length.
- **FR-002**: System MUST accept optional preferences — interests/themes, pace, party composition, and stated accessibility needs — and reflect any provided preferences in the generated plan.
- **FR-003**: System MUST apply sensible defaults for any optional preference not provided, and MUST NOT require them.
- **FR-004**: System MUST produce a plan organized as one group per day for the requested number of days (bounded per FR-027), where each day holds an ordered list of place/activity items.
- **FR-005**: Each generated place/activity item MUST include a name, a short description, a category drawn from the fixed category set (FR-028), and a timing expressed as a day-part (Morning / Afternoon / Evening) plus an explicit order index within its day.
- **FR-006**: System MUST validate the structure of generated output before displaying it, and MUST normalize it to the requested number of days.
- **FR-007**: System MUST show clear progress while a plan is being generated and MUST keep the interface responsive.
- **FR-008**: System MUST require the traveler's own AI key to perform generation, and MUST let the traveler provide and update that key.
- **FR-009**: System MUST NOT expose the traveler's AI key to any party other than the AI provider required to fulfill a generation request, and MUST NOT store it anywhere it could be read by other users.
- **FR-010**: When no AI key is configured, System MUST clearly indicate that generation is unavailable and how to enable it, without blocking manual planning.
- **FR-027**: System MUST bound trip length to between 1 and 7 days inclusive, and MUST apply a soft cap of approximately 6 place/activity items per day to generated plans to keep output and cost bounded.
- **FR-028**: System MUST constrain each place/activity category to a fixed set — Food, Sightseeing, Outdoors, Culture, Nightlife, Shopping, Transit, Accommodation — plus an "Other" value for anything that does not fit, and MUST map any generated category outside this set to "Other".

**Board & editing (P2)**

- **FR-011**: System MUST display a trip as a board with one column per day and a card for each place/activity.
- **FR-012**: Users MUST be able to add a card to a day, edit a card's fields, and delete a card.
- **FR-013**: Users MUST be able to reorder cards within a day and move a card between days.
- **FR-014**: All board interactions (add, edit, delete, reorder, move) MUST be operable via both pointer (drag-and-drop) and keyboard alone.
- **FR-015**: System MUST reflect every board change immediately in the view.
- **FR-016**: Users MUST be able to create and build a trip entirely by hand, with no AI involvement.
- **FR-017**: Users MUST be able to add and remove days from a trip.

**Persistence & portability (P3)**

- **FR-018**: System MUST persist a traveler's trip(s) on their own device so they survive a reload or later revisit, with no account.
- **FR-019**: System MUST support multiple saved trips and let the traveler view and open each of them.
- **FR-020**: Users MUST be able to export a trip and import it, reproducing the trip faithfully (all days, cards, ordering, and fields).
- **FR-021**: System MUST reject malformed or incompatible imports with a clear message and MUST NOT corrupt existing trips.
- **FR-022**: System MUST NOT store a traveler's trips on a server or collect personal data within this feature.
- **FR-029**: A trip export MUST be a single self-contained, human-readable file that contains the complete trip and carries a schema version identifier, so that a file exported by an earlier version can be recognized and imported (or clearly rejected) by a later version. Sharing in this feature is satisfied solely by this file export/import; no share link and no server-side storage are provided.

**Cross-cutting (constitution-derived)**

- **FR-023**: The entire experience MUST be fully keyboard operable and screen-reader friendly, meeting WCAG 2.2 AA, including the board and all drag interactions.
- **FR-024**: System MUST remain usable for creating, viewing, and editing trips whenever AI generation is unavailable for any reason.
- **FR-025**: The place/activity data model MUST include optional fields for estimated monetary cost, geographic coordinates, and accessibility metadata, carried from this feature onward even though no behavior in this feature reads or writes them.
- **FR-026**: System MUST guard against runaway generation by bounding request size and the number of days per request, and MUST NOT issue unbounded or automatically repeating generation calls.

### Key Entities *(include if feature involves data)*

- **Trip**: a single travel plan. Key attributes: title/destination, length (number of days or a date range), the ordered set of Days, the optional preferences captured at generation time, and created/updated timestamps. Owns its Days.
- **Day**: one day within a Trip. Key attributes: a day index/label (and optional date) and an ordered list of Places/Activities. Belongs to a Trip.
- **Place / Activity (card)**: a single thing to do or visit. Attributes used this feature: name, short description, category (from the fixed set in FR-028), day-part (Morning / Afternoon / Evening), and order index within its day. Attributes present but unused this feature (nullable/optional): estimated cost, geographic coordinates, accessibility metadata. Belongs to a Day.
- **Generation Request**: the transient set of traveler inputs used to produce a plan (destination, length, interests, pace, party composition, accessibility needs). Used to create a Trip; not itself persisted as a first-class record.
- **Traveler Settings**: the traveler's own AI key and app-level preferences, held locally on their device.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A traveler with a valid AI key can go from a blank state to a saved multi-day itinerary on the board in a single generation and in under 60 seconds of active effort (excluding model response time).
- **SC-002**: At least 95% of generations that return a response yield a board matching the requested number of days, with every card showing a name, description, and category (no empty or placeholder cards caused by malformed output).
- **SC-003**: A traveler can complete every board interaction (add, edit, delete, reorder within a day, move across days) using the keyboard alone, with zero interactions that require a pointer.
- **SC-004**: 100% of trips survive a page reload on the same device, and 100% of exported trips re-import with identical days, cards, ordering, and fields.
- **SC-005**: A traveler with no AI key configured (or who hits a generation failure) can still produce and save a complete trip entirely by hand.
- **SC-006**: The feature meets WCAG 2.2 AA, with no critical or serious automated accessibility violations on the primary screens (the trip-creation form and the board).
- **SC-007**: When generation fails or times out, the traveler sees a clear, non-technical message and can recover (retry or continue manually) in 100% of failure cases, with no broken or half-populated board left behind.

## Assumptions

- Target users are independent travelers planning leisure trips who are comfortable obtaining and pasting their own AI provider key for v1 (bring-your-own-key).
- "A trip" in v1 is a single-destination, multi-day plan; multi-city routing is out of scope.
- Trip length is bounded to **1–7 days** with a soft cap of about 6 place/activity items per day (clarified) to keep generated output and cost under control.
- Generation creates or populates a trip's board. Regenerating or AI-editing an existing plan is **out of scope** for this feature and reserved for a later feature.
- Sharing in v1 is satisfied solely by **file export/import** of a trip as a single self-contained, versioned, human-readable artifact (intended encoding: JSON). A copyable share link is explicitly deferred to a later feature (clarified).
- The interface and generated content are **English-first**; no localization or multi-language support is in scope for this feature.
- Persistence is per-device/per-browser; trips do not sync across devices except via explicit export/import. Clearing browser data or using private browsing may remove trips, and the traveler is warned of this.
- The AI key and trips are held locally on the traveler's device; no server-side storage of user trips and no personal-data collection occur within this feature.
- Weather, budget totals, map display, and accessibility-of-places filtering are out of scope here; only the data fields that later enable them are present (FR-025).
- Standard web application performance and error-handling expectations apply unless stated otherwise.

## Out of Scope (this feature)

- Conversational or AI-driven editing of an existing plan ("make day 2 cheaper", "add more food").
- Budget meter / cost totals; map and geolocation display; weather; accessibility-of-places filtering UI.
- Multi-city routing, real-time collaboration, booking or payments, and user accounts.
- Cross-device sync or any server-side storage of user trips.
