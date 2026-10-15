"use client";

import * as React from "react";
import { Button } from "@/components/ui/primitives";
import { TILE_PROVIDER_NAME } from "@/lib/map/config";

interface Props {
  onDismiss: () => void;
}

/**
 * First-visit tile-provider disclosure modal (Feature 002 FR-019 / SC-008).
 *
 * This component is rendered BEFORE {@link MapViewClient} is mounted and the
 * caller is responsible for not mounting that client until the user dismisses
 * this modal — so no tile request can fire before acknowledgement.
 *
 * Focus-trapped `role="dialog" aria-modal="true"` with a labelled title and a
 * primary Dismiss button that returns focus to the Map view afterwards.
 */
export function TileProviderDisclosure({ onDismiss }: Props) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Give the primary action focus on mount so Enter dismisses the dialog
    // immediately and SR/kbd users know where they are.
    const button = dialogRef.current?.querySelector<HTMLButtonElement>(
      "[data-testid='tile-disclosure-dismiss']",
    );
    button?.focus();
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tile-disclosure-title"
      aria-describedby="tile-disclosure-body"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-lg border p-5 shadow-lg"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      >
        <h2 id="tile-disclosure-title" className="text-base font-semibold">
          Map tiles are loaded from {TILE_PROVIDER_NAME}
        </h2>
        <div id="tile-disclosure-body" className="mt-2 flex flex-col gap-2 text-sm">
          <p style={{ color: "var(--muted-foreground)" }}>
            Opening the map sends your IP address to the tile provider on each tile
            request so it can decide which map image to send back.
          </p>
          <p style={{ color: "var(--muted-foreground)" }}>
            Any point you drop on the map is used only to fetch the surrounding tiles —
            no location data is sent anywhere else.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            onClick={onDismiss}
            variant="primary"
            data-testid="tile-disclosure-dismiss"
          >
            Got it, show the map
          </Button>
        </div>
      </div>
    </div>
  );
}
