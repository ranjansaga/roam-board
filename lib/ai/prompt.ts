import { MAX_ITEMS_PER_DAY, PLACE_CATEGORIES, type GenerationRequest } from "@/lib/domain/schema";

const PACE_HINT: Record<GenerationRequest["pace"], string> = {
  relaxed: "fewer activities per day, with downtime",
  balanced: "a balanced number of activities per day",
  packed: "more activities per day",
};

/** Build a bounded prompt from a validated request (free-text is already length-capped). */
export function buildItineraryPrompt(req: GenerationRequest): string {
  const interests = req.interests.length ? req.interests.join(", ") : "general highlights";
  return [
    `You are an expert travel planner. Create a ${req.days}-day itinerary for ${req.destination}.`,
    `Return exactly ${req.days} day(s). Each day has at most ${MAX_ITEMS_PER_DAY} activities.`,
    `Each activity must have: a name; a 1-2 sentence description; a category chosen from EXACTLY this set [${PLACE_CATEGORIES.join(", ")}]; and a dayPart that is one of morning, afternoon, or evening.`,
    `Traveler interests: ${interests}. Pace: ${req.pace} (${PACE_HINT[req.pace]}).`,
    req.party ? `Party: ${req.party}.` : "",
    req.accessibilityNeeds ? `Accessibility needs to consider: ${req.accessibilityNeeds}.` : "",
    `Order activities sensibly within each day (morning, then afternoon, then evening).`,
  ]
    .filter(Boolean)
    .join("\n");
}
