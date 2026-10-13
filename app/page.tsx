"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TripForm } from "@/components/trip-form/TripForm";
import { ManualTripForm } from "@/components/trip-form/ManualTripForm";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { useBoardStore } from "@/lib/store/board-store";
import { buildTrip, emptyTrip } from "@/lib/domain/trip";
import { readSettings } from "@/lib/persistence/settings";
import type { Day, GenerationRequest } from "@/lib/domain/schema";

export default function HomePage() {
  const router = useRouter();
  const saveTrip = useBoardStore((s) => s.saveTrip);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGenerate(request: GenerationRequest) {
    setError(null);
    const settings = readSettings();
    if (!settings.geminiApiKey) {
      setError("Add your Gemini API key in AI settings below to generate a plan.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request,
          apiKey: settings.geminiApiKey,
          model: settings.model ?? undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? "Generation failed. Please try again.");
        return;
      }
      const data = (await res.json()) as { itinerary: { days: Day[] } };
      const trip = buildTrip(request, data.itinerary.days);
      saveTrip(trip);
      router.push(`/trips/${trip.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleManualCreate(destination: string, days: number) {
    const trip = emptyTrip(destination, days);
    saveTrip(trip);
    router.push(`/trips/${trip.id}`);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan a trip</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Describe your trip and generate a day-by-day plan you can arrange on a board.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <TripForm onGenerate={handleGenerate} loading={loading} />
      <SettingsPanel />
      <ManualTripForm onCreate={handleManualCreate} />
    </div>
  );
}
