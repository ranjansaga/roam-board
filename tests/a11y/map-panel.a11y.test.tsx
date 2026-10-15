import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { axe } from "jest-axe";
import { useBoardStore } from "@/lib/store/board-store";
import { emptyTrip } from "@/lib/domain/trip";
import { addPlace, setCoordinates } from "@/lib/domain/board-ops";
import { MapPanel } from "@/app/trips/[tripId]/map/MapPanel";
import { DISCLOSURE_STORAGE_KEY } from "@/lib/hooks/use-tile-provider-disclosure";
import type { MapViewClientProps } from "@/app/trips/[tripId]/map/MapViewClient";

vi.mock("@/app/trips/[tripId]/map/MapViewClient", () => ({
  MapViewClient: (props: MapViewClientProps) => (
    <div data-testid="map-view-client" role="application" aria-label="Trip map">
      <ul>
        {props.pins.map((p) => (
          <li key={p.placeId}>{p.name}</li>
        ))}
      </ul>
    </div>
  ),
}));

beforeEach(() => {
  try {
    window.localStorage.setItem(DISCLOSURE_STORAGE_KEY, new Date().toISOString());
  } catch {}
  act(() => {
    useBoardStore.setState({ currentTrip: null, trips: [], storageAvailable: true });
  });
});
afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {}
});

describe("MapPanel accessibility", () => {
  it("has no axe violations with pinned content", async () => {
    const base = emptyTrip("Bali", 2);
    let t = addPlace(base, base.days[0].id, {
      name: "Monkey Forest",
      description: "sacred grove",
      category: "sightseeing",
      dayPart: "morning",
    });
    t = setCoordinates(t, t.days[0].places[0].id, { lat: -8.5188, lng: 115.2606 });
    act(() => {
      useBoardStore.setState({ currentTrip: t, trips: [t], storageAvailable: true });
    });

    const { container, findByTestId } = render(<MapPanel tripId={t.id} />);
    await findByTestId("map-view-client");
    const results = await axe(container);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no axe violations when the disclosure dialog is up", async () => {
    try {
      window.localStorage.clear();
    } catch {}
    const base = emptyTrip("Bali", 1);
    const t = addPlace(base, base.days[0].id, {
      name: "P",
      description: "",
      category: "other",
      dayPart: "morning",
    });
    act(() => {
      useBoardStore.setState({ currentTrip: t, trips: [t], storageAvailable: true });
    });

    const { container, findByRole } = render(<MapPanel tripId={t.id} />);
    await findByRole("dialog", { name: /Map tiles/i });
    const results = await axe(container);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
