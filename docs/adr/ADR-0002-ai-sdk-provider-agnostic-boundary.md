# ADR-0002: Vercel AI SDK with a provider-agnostic boundary (Gemini-first)

- **Status**: Accepted
- **Date**: 2026-10-12

## Context

We need structured, validated itinerary output from an LLM, a single AI boundary (Principle IV), and
easy extensibility to other providers. The user chose Gemini first.

## Decision

Use the **Vercel AI SDK** (`ai` v7 + `@ai-sdk/google` v4) with `generateObject` + a **Zod** schema for
structured output, wrapped inside our own `lib/ai` module so both the SDK and the provider are
swappable. **Gemini is the first provider.** The model id is **configuration** (`GEMINI_MODEL` env +
per-user override), never a hardcoded constant.

## Consequences

- Schema-validated output and token/cost metadata come built in (Principle IV).
- Adding OpenAI/Anthropic later is a new adapter behind the boundary, not a rewrite.
- Model id as config survives provider churn (the Gemini 2.5 line shuts down 2026-10-16); the default
  targets the Gemini 3.x Flash family.
- CopilotKit is explicitly deferred to the later conversational-editing feature.
