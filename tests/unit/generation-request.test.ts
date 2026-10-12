import { describe, it, expect } from "vitest";
import { GenerationRequestSchema } from "@/lib/domain/schema";

describe("GenerationRequestSchema", () => {
  it("accepts minimal input and applies defaults", () => {
    const r = GenerationRequestSchema.parse({ destination: "Lisbon", days: 4 });
    expect(r.pace).toBe("balanced");
    expect(r.interests).toEqual([]);
    expect(r.party).toBe("");
  });

  it("reflects provided preferences", () => {
    const r = GenerationRequestSchema.parse({
      destination: "Lisbon",
      days: 3,
      interests: ["food", "history"],
      pace: "relaxed",
    });
    expect(r.interests).toEqual(["food", "history"]);
    expect(r.pace).toBe("relaxed");
  });

  it("rejects days outside 1–7", () => {
    expect(GenerationRequestSchema.safeParse({ destination: "X", days: 8 }).success).toBe(false);
    expect(GenerationRequestSchema.safeParse({ destination: "X", days: 0 }).success).toBe(false);
  });

  it("rejects an empty destination", () => {
    expect(GenerationRequestSchema.safeParse({ destination: "", days: 3 }).success).toBe(false);
  });

  it("rejects more than 10 interests", () => {
    const interests = Array.from({ length: 11 }, (_, i) => `i${i}`);
    expect(GenerationRequestSchema.safeParse({ destination: "X", days: 3, interests }).success).toBe(
      false,
    );
  });
});
