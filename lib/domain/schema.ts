import { z } from "zod";

// --- Enumerations -----------------------------------------------------------

export const PLACE_CATEGORIES = [
  "food",
  "sightseeing",
  "outdoors",
  "culture",
  "nightlife",
  "shopping",
  "transit",
  "accommodation",
  "other",
] as const;
export const PlaceCategorySchema = z.enum(PLACE_CATEGORIES);
export type PlaceCategory = z.infer<typeof PlaceCategorySchema>;

export const DAY_PARTS = ["morning", "afternoon", "evening"] as const;
export const DayPartSchema = z.enum(DAY_PARTS);
export type DayPart = z.infer<typeof DayPartSchema>;

export const PACES = ["relaxed", "balanced", "packed"] as const;
export const PaceSchema = z.enum(PACES);
export type Pace = z.infer<typeof PaceSchema>;

// --- Bounds (FR-027) --------------------------------------------------------

export const TRIP_MIN_DAYS = 1;
export const TRIP_MAX_DAYS = 7;
export const MAX_ITEMS_PER_DAY = 6;

// --- Forward-compatible roadmap fields (FR-025, nullable, unused in 001) -----

export const CostSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().min(1).max(8),
});
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export const AccessibilitySchema = z.object({
  wheelchairAccessible: z.boolean().optional(),
  stepFree: z.boolean().optional(),
  notes: z.string().max(400).optional(),
});

// --- Core entities ----------------------------------------------------------

export const PlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(600),
  category: PlaceCategorySchema,
  dayPart: DayPartSchema,
  order: z.number().int().min(0),
  // Roadmap fields — present from Feature 001, unused here (Constitution Principle II):
  cost: CostSchema.nullable().default(null),
  coordinates: CoordinatesSchema.nullable().default(null),
  accessibility: AccessibilitySchema.nullable().default(null),
});
export type Place = z.infer<typeof PlaceSchema>;

export const DaySchema = z.object({
  id: z.string().min(1),
  index: z.number().int().min(0),
  label: z.string().min(1).max(40),
  date: z.string().nullable().default(null),
  places: z.array(PlaceSchema),
});
export type Day = z.infer<typeof DaySchema>;

export const GenerationRequestSchema = z.object({
  destination: z.string().min(1).max(120),
  days: z.number().int().min(TRIP_MIN_DAYS).max(TRIP_MAX_DAYS),
  interests: z.array(z.string().min(1).max(40)).max(10).default([]),
  pace: PaceSchema.default("balanced"),
  party: z.string().max(120).default(""),
  accessibilityNeeds: z.string().max(240).default(""),
});
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

export const TripSourceSchema = z.enum(["ai", "manual"]);
export type TripSource = z.infer<typeof TripSourceSchema>;

export const TripSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  destination: z.string().min(1).max(120),
  days: z.array(DaySchema).min(TRIP_MIN_DAYS).max(TRIP_MAX_DAYS),
  preferences: GenerationRequestSchema.nullable().default(null),
  source: TripSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Trip = z.infer<typeof TripSchema>;

// --- AI generation output (the generateObject target) -----------------------
// Deliberately permissive on category/dayPart: the boundary coerces them during
// normalization (FR-028), so an off-list value becomes "other" rather than a hard failure.
// lat/lng are OPTIONAL (Feature 002, FR-006). The boundary folds valid pairs into
// Place.coordinates and leaves invalid or missing pairs as null.

export const GeneratedItinerarySchema = z.object({
  days: z.array(
    z.object({
      places: z.array(
        z.object({
          name: z.string().min(1).max(120),
          description: z.string().max(600),
          category: z.string(),
          dayPart: z.string(),
          lat: z.number().optional(),
          lng: z.number().optional(),
        }),
      ),
    }),
  ),
});
export type GeneratedItinerary = z.infer<typeof GeneratedItinerarySchema>;

// --- Traveler settings (local, on-device) -----------------------------------

export const TravelerSettingsSchema = z.object({
  geminiApiKey: z.string().nullable().default(null),
  model: z.string().nullable().default(null),
  reducedMotion: z.boolean().default(false),
});
export type TravelerSettings = z.infer<typeof TravelerSettingsSchema>;

// --- Trip export file (FR-029) ----------------------------------------------

export const TRIP_EXPORT_SCHEMA_VERSION = 1;
export const TripExportSchema = z.object({
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  app: z.literal("roam-board").optional(),
  trip: TripSchema,
});
export type TripExport = z.infer<typeof TripExportSchema>;
