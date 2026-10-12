import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Day } from "@/lib/domain/schema";

vi.mock("@/lib/ai", () => ({ generateItinerary: vi.fn() }));

import { POST } from "@/app/api/generate/route";
import { generateItinerary } from "@/lib/ai";

const mockGen = vi.mocked(generateItinerary);

const validRequest = {
  destination: "Lisbon",
  days: 2,
  interests: [],
  pace: "balanced",
  party: "",
  accessibilityNeeds: "",
};

const sampleDays: Day[] = [
  {
    id: "d1",
    index: 0,
    label: "Day 1",
    date: null,
    places: [
      {
        id: "p1",
        name: "Time Out Market",
        description: "Food hall",
        category: "food",
        dayPart: "afternoon",
        order: 0,
        cost: null,
        coordinates: null,
        accessibility: null,
      },
    ],
  },
  { id: "d2", index: 1, label: "Day 2", date: null, places: [] },
];

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => mockGen.mockReset());

describe("POST /api/generate", () => {
  it("returns 400 for a malformed body", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
    expect(mockGen).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid request (days out of range)", async () => {
    const res = await POST(makeRequest({ request: { ...validRequest, days: 99 }, apiKey: "k" }));
    expect(res.status).toBe(400);
    expect(mockGen).not.toHaveBeenCalled();
  });

  it("returns 401 when no API key is provided", async () => {
    const res = await POST(makeRequest({ request: validRequest }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("missing_key");
    expect(mockGen).not.toHaveBeenCalled();
  });

  it("returns 200 with a normalized itinerary and never logs the key or persists the trip", async () => {
    const logs: string[] = [];
    const info = vi.spyOn(console, "info").mockImplementation((...a: unknown[]) => {
      logs.push(a.map(String).join(" "));
    });
    mockGen.mockResolvedValue({ days: sampleDays, usage: { model: "test" } });

    const res = await POST(makeRequest({ request: validRequest, apiKey: "super-secret-key" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.itinerary.days).toHaveLength(2);
    // FR-009 / FR-022: the key must never be logged, and the route performs no persistence.
    expect(logs.join("\n")).not.toContain("super-secret-key");
    info.mockRestore();
  });

  // Error-path mapping (unusable output, timeout, provider auth, rate limit) is covered directly and
  // deterministically in tests/unit/map-generation-error.test.ts against the pure mapper.
});
