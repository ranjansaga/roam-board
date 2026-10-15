import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBoardStore } from "@/lib/store/board-store";
import { emptyTrip } from "@/lib/domain/trip";
import { addPlace, setCoordinates } from "@/lib/domain/board-ops";
import { MapPanel } from "@/app/trips/[tripId]/map/MapPanel";
import { DISCLOSURE_STORAGE_KEY } from "@/lib/hooks/use-tile-provider-disclosure";
import type { MapViewClientProps } from "@/app/trips/[tripId]/map/MapViewClient";

/**
 * The real MapViewClient uses Leaflet which does not play nicely with jsdom
 * (SVG/DOM behavior drift, no canvas). We mock it to a plain list that
 * surfaces exactly what the parent passes in, so we can assert on viewmodel
 * behavior without rendering a real map. The browser render path is covered
 * by a Playwright e2e (tests/e2e/trip-map.spec.ts).
 */
vi.mock("@/app/trips/[tripId]/map/MapViewClient", () => ({
  MapViewClient: (props: MapViewClientProps) => (
    <div data-testid="map-view-client">
      <ul data-testid="map-view-pins">
        {props.pins.map((p) => (
          <li key={p.placeId}>
            {p.name} — Day {p.dayIndex + 1}
          </li>
        ))}
      </ul>
    </div>
  ),
}));

async function seedTrip() {
  const base = emptyTrip("Bali", 2);
  const day1Id = base.days[0].id;
  const day2Id = base.days[1].id;
  let t = addPlace(base, day1Id, {
    name: "Monkey Forest",
    description: "sacred grove",
    category: "sightseeing",
    dayPart: "morning",
  });
  t = addPlace(t, day1Id, {
    name: "Warung Lunch",
    description: "local eats",
    category: "food",
    dayPart: "afternoon",
  });
  t = addPlace(t, day2Id, {
    name: "Beach",
    description: "",
    category: "outdoors",
    dayPart: "morning",
  });
  t = setCoordinates(t, t.days[0].places[0].id, { lat: -8.5188, lng: 115.2606 });
  t = setCoordinates(t, t.days[1].places[0].id, { lat: -8.72, lng: 115.17 });
  // Note: Warung Lunch stays unlocated → should land in the tray (US2).
  act(() => {
    useBoardStore.setState({ currentTrip: t, trips: [t], storageAvailable: true });
  });
  return t;
}

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {}
  act(() => {
    useBoardStore.setState({ currentTrip: null, trips: [], storageAvailable: true });
  });
});
afterEach(() => {
  act(() => {
    useBoardStore.setState({ currentTrip: null, trips: [], storageAvailable: true });
  });
});

describe("MapPanel — disclosure gate (US1 / SC-008)", () => {
  it("does NOT render the MapViewClient until the disclosure is dismissed", async () => {
    const trip = await seedTrip();
    render(<MapPanel tripId={trip.id} />);

    expect(screen.getByRole("dialog", { name: /Map tiles/i })).toBeInTheDocument();
    expect(screen.queryByTestId("map-view-client")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("tile-disclosure-dismiss"));
    expect(screen.queryByRole("dialog", { name: /Map tiles/i })).not.toBeInTheDocument();
    expect(await screen.findByTestId("map-view-client")).toBeInTheDocument();
  });

  it("skips the disclosure when it has already been acknowledged in this browser", async () => {
    try {
      window.localStorage.setItem(DISCLOSURE_STORAGE_KEY, new Date().toISOString());
    } catch {}
    const trip = await seedTrip();
    render(<MapPanel tripId={trip.id} />);
    expect(screen.queryByRole("dialog", { name: /Map tiles/i })).not.toBeInTheDocument();
    expect(await screen.findByTestId("map-view-client")).toBeInTheDocument();
  });
});

describe("MapPanel — US1 behavior", () => {
  beforeEach(() => {
    try {
      window.localStorage.setItem(DISCLOSURE_STORAGE_KEY, new Date().toISOString());
    } catch {}
  });

  it("renders exactly the located pins and lists them for screen readers", async () => {
    const trip = await seedTrip();
    render(<MapPanel tripId={trip.id} />);
    const pins = await screen.findByTestId("map-view-pins");
    expect(within(pins).getAllByRole("listitem")).toHaveLength(2);
    const summary = screen.getByLabelText("Map summary");
    expect(summary).toHaveTextContent("2 of 3 places with a saved location");
    expect(summary).toHaveTextContent("Monkey Forest");
    expect(summary).toHaveTextContent("Beach");
  });

  it("day filter projects pins to a single day", async () => {
    const trip = await seedTrip();
    render(<MapPanel tripId={trip.id} />);
    const user = userEvent.setup();
    // Day 2's radio shows "1 place mapped" per the aria-label.
    await user.click(screen.getByLabelText(/Day 2, 1 place mapped/i));
    const pins = await screen.findByTestId("map-view-pins");
    const items = within(pins).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Beach");
  });

  it("renders an empty state when the trip has no located places", async () => {
    const base = emptyTrip("Nowhere", 1);
    const t = addPlace(base, base.days[0].id, {
      name: "Unknown",
      description: "",
      category: "other",
      dayPart: "morning",
    });
    act(() => {
      useBoardStore.setState({ currentTrip: t, trips: [t], storageAvailable: true });
    });
    render(<MapPanel tripId={t.id} />);
    expect(await screen.findByText(/No places have a location yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("map-view-client")).not.toBeInTheDocument();
  });
});
