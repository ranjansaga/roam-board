"use client";

import * as React from "react";
import { Button, Input, Label } from "@/components/ui/primitives";
import { TRIP_MAX_DAYS, TRIP_MIN_DAYS } from "@/lib/domain/schema";

export function ManualTripForm({ onCreate }: { onCreate: (destination: string, days: number) => void }) {
  const [destination, setDestination] = React.useState("");
  const [days, setDays] = React.useState(3);
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dest = destination.trim();
    if (!dest) {
      setError("Enter a destination.");
      return;
    }
    const n = Math.max(TRIP_MIN_DAYS, Math.min(Number(days) || TRIP_MIN_DAYS, TRIP_MAX_DAYS));
    onCreate(dest, n);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <h2 className="text-sm font-semibold">Prefer to build it yourself?</h2>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Start a blank trip and add activities by hand — no AI key needed.
        </p>
      </div>
      <div>
        <Label htmlFor="m-destination">City or place</Label>
        <Input
          id="m-destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Porto"
        />
      </div>
      <div>
        <Label htmlFor="m-days">Number of days</Label>
        <Input
          id="m-days"
          type="number"
          min={TRIP_MIN_DAYS}
          max={TRIP_MAX_DAYS}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="ghost">
        Start blank trip
      </Button>
    </form>
  );
}
