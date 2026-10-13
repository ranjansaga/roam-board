"use client";

import * as React from "react";
import type { Trip } from "@/lib/domain/schema";
import { tripToText } from "@/lib/export/trip-text";
import { exportTripToJson } from "@/lib/export/trip-file";
import { Button } from "@/components/ui/primitives";

export function ShareActions({ trip }: { trip: Trip }) {
  const [copied, setCopied] = React.useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(tripToText(trip));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the backup download still works.
    }
  }

  function backup() {
    const blob = new Blob([exportTripToJson(trip)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trip.destination.toLowerCase().replace(/\s+/g, "-") || "trip"}.roamboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" className="text-xs" onClick={copyText}>
        {copied ? "Copied ✓" : "Copy as text"}
      </Button>
      <Button type="button" variant="ghost" className="text-xs" onClick={backup}>
        Back up
      </Button>
    </div>
  );
}
