# Contract: `POST /api/generate` (the AI boundary)

**Feature**: `001-ai-itinerary-kanban` · **Type**: server Route Handler (the single AI boundary, Principle IV)

This is the only network surface in Feature 001. It is server-only; the client never calls Gemini
directly. It accepts a bounded generation request plus the traveler's BYOK key, calls Gemini via
`lib/ai`, validates+normalizes the result, and returns a ready-to-render itinerary.

## Request

`Content-Type: application/json`

```jsonc
{
  "request": {
    "destination": "Lisbon",     // required, 1–120 chars
    "days": 4,                    // required, integer 1–7  (FR-027)
    "interests": ["food","history"], // optional, 0–10 items, each ≤ 40 chars
    "pace": "relaxed",            // optional: relaxed|balanced|packed (default balanced)
    "party": "2 adults",         // optional, ≤ 120 chars
    "accessibilityNeeds": ""      // optional, ≤ 240 chars
  },
  "apiKey": "<traveler Gemini key>", // required; used for this call only, never stored (FR-009)
  "model": "gemini-3.x-flash"        // optional; overrides server default GEMINI_MODEL
}
```

**Server-side validation (before any model call):** parse `request` with the `GenerationRequest` Zod
schema; reject oversize/invalid input with `400` (Principle V request-size cap). Collapse duplicate
in-flight requests with identical `(request, model)` (Principle V).

## Success response — `200`

```jsonc
{
  "itinerary": {
    "days": [
      { "places": [
        { "id":"...", "name":"...", "description":"...", "category":"food", "dayPart":"morning", "order":0,
          "cost":null, "coordinates":null, "accessibility":null }
      ] }
    ]
  },
  "usage": { "inputTokens": 0, "outputTokens": 0, "model": "gemini-3.x-flash" } // for cost logging (Principle IV)
}
```

The returned `itinerary` is already validated and normalized per
[data-model.md](../data-model.md): exactly `request.days` days, `order` assigned, categories coerced,
~6-items/day cap applied. The three roadmap fields are present and `null`.

## Error responses

| Status | `code` | When | Client behavior |
|---|---|---|---|
| `400` | `invalid_request` | Input fails schema / exceeds caps | Show field errors; no model call made |
| `401` | `missing_key` | No `apiKey` provided | Prompt to add a BYOK key (FR-010); manual planning still available |
| `402` / `401` | `provider_auth` | Provider rejects the key | "Your key was rejected" message |
| `429` | `provider_rate_limited` | Provider throttles | Offer retry-later; app stays usable |
| `408` / `504` | `timeout` | Exceeds `AI_REQUEST_TIMEOUT_MS` | Clear timeout message + retry (FR-007/SC-007) |
| `422` | `unusable_output` | Model output fails Zod validation/normalization | "Couldn't produce a valid plan, try again" — never render partial board (SC-007) |
| `502` | `provider_error` | Other upstream failure | Generic non-technical error; continue manually (FR-024) |

Error body: `{ "error": { "code": "...", "message": "<non-technical, user-facing>" } }`.

## Guarantees / invariants

- The key is read from the request, used for exactly one provider call, and never logged or persisted
  (FR-009).
- Every call enforces a timeout and validates output before returning (Principle IV).
- No unbounded or auto-repeating calls; one request → at most one provider call (Principle V).
- A failure at any step leaves the client able to create/view/edit trips manually (FR-024).
- The response shape is identical regardless of provider — the seam that lets OpenAI/Anthropic drop
  in later without changing the client.
