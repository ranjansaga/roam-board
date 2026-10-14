"use client";

import * as React from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/primitives";
import {
  GenerationRequestSchema,
  PACES,
  TRIP_MAX_DAYS,
  TRIP_MIN_DAYS,
  type GenerationRequest,
} from "@/lib/domain/schema";

interface Props {
  onGenerate: (request: GenerationRequest) => void;
  loading?: boolean;
}

export function TripForm({ onGenerate, loading = false }: Props) {
  const [destination, setDestination] = React.useState("");
  const [days, setDays] = React.useState(3);
  const [interests, setInterests] = React.useState("");
  const [pace, setPace] = React.useState<GenerationRequest["pace"]>("balanced");
  const [party, setParty] = React.useState("");
  const [accessibilityNeeds, setAccessibilityNeeds] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const candidate = {
      destination: destination.trim(),
      days: Number(days),
      interests: interests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      pace,
      party: party.trim(),
      accessibilityNeeds: accessibilityNeeds.trim(),
    };
    const parsed = GenerationRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }
    onGenerate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="destination">Destination</Label>
        <Input
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Bali"
          required
        />
      </div>
      <div>
        <Label htmlFor="days">Days (1–7)</Label>
        <Input
          id="days"
          type="number"
          min={TRIP_MIN_DAYS}
          max={TRIP_MAX_DAYS}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="interests">Interests (comma-separated, optional)</Label>
        <Input
          id="interests"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="food, history, nature"
        />
      </div>
      <div>
        <Label htmlFor="pace">Pace</Label>
        <Select
          id="pace"
          value={pace}
          onChange={(e) => setPace(e.target.value as GenerationRequest["pace"])}
        >
          {PACES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="party">Who&apos;s travelling? (optional)</Label>
        <Input
          id="party"
          value={party}
          onChange={(e) => setParty(e.target.value)}
          placeholder="2 adults, 1 child"
        />
      </div>
      <div>
        <Label htmlFor="accessibility">Accessibility needs (optional)</Label>
        <Textarea
          id="accessibility"
          value={accessibilityNeeds}
          onChange={(e) => setAccessibilityNeeds(e.target.value)}
          rows={2}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Generating…" : "Generate itinerary"}
      </Button>
    </form>
  );
}
