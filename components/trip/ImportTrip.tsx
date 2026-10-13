"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useBoardStore } from "@/lib/store/board-store";
import { importTripFromJson } from "@/lib/export/trip-file";
import { Label } from "@/components/ui/primitives";

export function ImportTrip() {
  const router = useRouter();
  const saveTrip = useBoardStore((s) => s.saveTrip);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    e.target.value = ""; // allow re-importing the same file
    const result = importTripFromJson(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    saveTrip(result.trip);
    router.push(`/trips/${result.trip.id}`);
  }

  return (
    <section
      aria-label="Import a trip"
      className="flex flex-col gap-2 rounded-lg border p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <h2 className="text-sm font-semibold">Import a backup</h2>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Open a Roam Board backup file (.json) you or someone else saved.
      </p>
      <Label htmlFor="import-file" className="sr-only">
        Import a trip backup file
      </Label>
      <input
        id="import-file"
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="text-sm"
      />
      {error ? (
        <p role="alert" className="text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
