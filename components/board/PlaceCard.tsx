"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import {
  DAY_PARTS,
  PLACE_CATEGORIES,
  type Day,
  type Place,
  type PlaceCategory,
  type DayPart,
} from "@/lib/domain/schema";
import { useBoardStore } from "@/lib/store/board-store";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/primitives";

interface Props {
  place: Place;
  day: Day;
  days: Day[];
}

export function PlaceCard({ place, day, days }: Props) {
  const updatePlace = useBoardStore((s) => s.updatePlace);
  const deletePlace = useBoardStore((s) => s.deletePlace);
  const moveCard = useBoardStore((s) => s.moveCard);

  const [editing, setEditing] = React.useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });

  const index = day.places.findIndex((p) => p.id === place.id);
  const otherDays = days.filter((d) => d.id !== day.id);

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: "var(--border)",
    background: "var(--card)",
  };

  if (editing) {
    return (
      <li>
        <PlaceEditForm
          place={place}
          onSave={(patch) => {
            updatePlace(place.id, patch);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style}>
      <article
        className="rounded-md border p-3"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
        aria-label={`${place.name} — ${place.category}, ${place.dayPart}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium">{place.name}</h3>
          <button
            type="button"
            className="shrink-0 cursor-grab rounded px-1 text-xs"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
            aria-label={`Drag ${place.name}`}
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
        </div>
        {place.description ? (
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {place.description}
          </p>
        ) : null}
        <p className="mt-1 text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>
          {place.category} · {place.dayPart}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <IconButton label={`Move ${place.name} up`} disabled={index <= 0} onClick={() => moveCard(place.id, day.id, index - 1)}>
            ↑
          </IconButton>
          <IconButton
            label={`Move ${place.name} down`}
            disabled={index >= day.places.length - 1}
            onClick={() => moveCard(place.id, day.id, index + 1)}
          >
            ↓
          </IconButton>
          {otherDays.length > 0 ? (
            <label className="sr-only" htmlFor={`move-${place.id}`}>
              Move {place.name} to another day
            </label>
          ) : null}
          {otherDays.length > 0 ? (
            <select
              id={`move-${place.id}`}
              className="rounded border px-1 py-0.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)" }}
              value=""
              onChange={(e) => {
                const target = days.find((d) => d.id === e.target.value);
                if (target) moveCard(place.id, target.id, target.places.length);
              }}
            >
              <option value="" disabled>
                Move to…
              </option>
              {otherDays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : null}
          <span className="ml-auto flex gap-1">
            <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-2 py-1 text-xs"
              style={{ color: "var(--danger)" }}
              onClick={() => deletePlace(place.id)}
            >
              Delete
            </Button>
          </span>
        </div>
      </article>
    </li>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded border px-1.5 py-0.5 text-xs disabled:opacity-40"
      style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)" }}
    >
      {children}
    </button>
  );
}

function PlaceEditForm({
  place,
  onSave,
  onCancel,
}: {
  place: Place;
  onSave: (patch: { name: string; description: string; category: PlaceCategory; dayPart: DayPart }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(place.name);
  const [description, setDescription] = React.useState(place.description);
  const [category, setCategory] = React.useState<PlaceCategory>(place.category);
  const [dayPart, setDayPart] = React.useState<DayPart>(place.dayPart);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), category, dayPart });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border p-3"
      style={{ borderColor: "var(--ring)", background: "var(--card)" }}
    >
      <Label htmlFor={`name-${place.id}`}>Name</Label>
      <Input id={`name-${place.id}`} value={name} onChange={(e) => setName(e.target.value)} required />
      <Label htmlFor={`desc-${place.id}`} className="mt-2">
        Description
      </Label>
      <Textarea
        id={`desc-${place.id}`}
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <div className="flex-1">
          <Label htmlFor={`cat-${place.id}`}>Category</Label>
          <Select
            id={`cat-${place.id}`}
            value={category}
            onChange={(e) => setCategory(e.target.value as PlaceCategory)}
          >
            {PLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor={`part-${place.id}`}>Time</Label>
          <Select
            id={`part-${place.id}`}
            value={dayPart}
            onChange={(e) => setDayPart(e.target.value as DayPart)}
          >
            {DAY_PARTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" className="px-2 py-1 text-xs">
          Save
        </Button>
        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
