"use client";

import * as React from "react";
import type { DayFilter, DayLegend } from "./useMapViewModel";

interface Props {
  legend: readonly DayLegend[];
  filter: DayFilter;
  onChange: (filter: DayFilter) => void;
}

const ALL_RADIO_VALUE = "__all__";

/**
 * Day-filter radio group for the Map view (Feature 002 FR-005).
 *
 * One radio per day plus "All days". Standard radio-group semantics: Tab lands
 * on the selected radio; ArrowLeft/ArrowRight moves selection AND focus
 * (handled by the native fieldset+radio combo in all evergreen browsers).
 */
export function DayFilterChips({ legend, filter, onChange }: Props) {
  const selectedValue = filter.kind === "all" ? ALL_RADIO_VALUE : filter.dayId;

  function handleChange(value: string) {
    if (value === ALL_RADIO_VALUE) onChange({ kind: "all" });
    else onChange({ kind: "single", dayId: value });
  }

  return (
    <fieldset
      className="flex flex-wrap gap-2"
      aria-describedby="day-filter-hint"
      style={{ border: "none", padding: 0, margin: 0 }}
    >
      <legend className="sr-only">Day filter</legend>
      <span id="day-filter-hint" className="sr-only">
        Choose which day&apos;s places to show on the map. Use arrow keys to move between options.
      </span>
      <Chip
        value={ALL_RADIO_VALUE}
        name="map-day-filter"
        selected={selectedValue === ALL_RADIO_VALUE}
        onChange={handleChange}
        label="All days"
        subLabel={`${legend.reduce((n, l) => n + l.count, 0)} located`}
      />
      {legend.map((d) => (
        <Chip
          key={d.dayId}
          value={d.dayId}
          name="map-day-filter"
          selected={selectedValue === d.dayId}
          onChange={handleChange}
          label={d.label}
          subLabel={`${d.count} place${d.count === 1 ? "" : "s"}`}
          color={d.colorToken}
          ariaLabel={`${d.label}, ${d.count} place${d.count === 1 ? "" : "s"} mapped`}
        />
      ))}
    </fieldset>
  );
}

interface ChipProps {
  value: string;
  name: string;
  selected: boolean;
  onChange: (value: string) => void;
  label: string;
  subLabel?: string;
  color?: string;
  ariaLabel?: string;
}

function Chip({ value, name, selected, onChange, label, subLabel, color, ariaLabel }: ChipProps) {
  // Focus ring is driven by :has(input:focus-visible) so the native radio stays
  // the real focus target and screen-reader semantics stay standard.
  return (
    <label
      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2"
      style={{
        background: selected ? "var(--muted)" : "var(--card)",
        borderColor: selected ? "var(--ring)" : "var(--border)",
        color: "var(--foreground)",
        outlineColor: "var(--ring)",
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        aria-label={ariaLabel}
        className="sr-only"
      />
      {color && (
        <span
          aria-hidden
          className="inline-block size-3 rounded-full"
          style={{ background: color }}
        />
      )}
      <span className="font-medium">{label}</span>
      {subLabel && (
        <span style={{ color: "var(--muted-foreground)" }}>{subLabel}</span>
      )}
    </label>
  );
}
