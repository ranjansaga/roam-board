# Contract: Trip Export / Import File

**Feature**: `001-ai-itinerary-kanban` · **Type**: portable file (FR-020, FR-021, FR-029)

Sharing/portability in v1 is satisfied **solely** by this file — no share link, no server storage
(clarified). A trip exports to one self-contained, human-readable JSON file and imports back
faithfully.

## File format

- Media type: `application/json` · Suggested extension: `.roamboard.json`
- UTF-8, pretty-printed (human-readable).

```jsonc
{
  "schemaVersion": 1,                 // integer; the ONLY compatibility gate
  "exportedAt": "2026-10-12T10:00:00Z",
  "app": "roam-board",                // provenance marker
  "trip": {
    "id": "…", "title": "Lisbon long weekend", "destination": "Lisbon",
    "source": "ai",
    "createdAt": "…", "updatedAt": "…",
    "preferences": { "destination":"Lisbon", "days":4, "interests":["food"], "pace":"relaxed" },
    "days": [
      { "id":"…", "index":0, "label":"Day 1", "date":null,
        "places": [
          { "id":"…", "name":"…", "description":"…", "category":"food", "dayPart":"morning", "order":0,
            "cost":null, "coordinates":null, "accessibility":null }
        ] }
    ]
  }
}
```

The embedded `trip` conforms exactly to the `Trip` schema in [data-model.md](../data-model.md),
including the nullable `cost`/`coordinates`/`accessibility` fields (so a trip exported now stays valid
after later features add those). On import, the trip is given fresh ids and becomes the importer's own
editable copy (FR-020 scenario 4).

## Import rules (FR-021)

1. Parse JSON. On parse failure → reject: *"This file isn't a valid Roam Board trip."*
2. Read `schemaVersion`:
   - **Recognized (≤ current, here `1`)** → validate `trip` against the `Trip` Zod schema; migrate if
     an older version; import on success.
   - **Unknown / newer than supported** → reject: *"This trip was made with a newer version of Roam
     Board."* (edge case: schema-version mismatch).
3. If `trip` fails schema validation → reject: *"This file is missing or has invalid trip data."*
4. **A rejected import never modifies or corrupts existing trips** (FR-021) — validation completes
   before anything is written through the `TripRepository`.

## Round-trip guarantee (SC-004)

Export → import reproduces the trip with identical days, cards, ordering, and all fields (ids may be
reassigned on import; all content fields are byte-faithful). This is covered by a unit test
(`tests/unit/export-roundtrip`) and the E2E flow.

## Versioning policy

`schemaVersion` is bumped only when the persisted `Trip` shape changes incompatibly. Adding the
roadmap fields later does **not** bump it (they already exist as nullable — Principle II). Each bump
ships a migration from the previous version.
