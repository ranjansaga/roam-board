"use client";

import * as React from "react";
import { Button, Input, Label } from "@/components/ui/primitives";
import { readSettings, writeSettings } from "@/lib/persistence/settings";

export function SettingsPanel({ onSaved }: { onSaved?: () => void }) {
  const [form, setForm] = React.useState({ apiKey: "", model: "" });
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    // Hydration-safe: on-device settings can only be read client-side after mount.
    const s = readSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ apiKey: s.geminiApiKey ?? "", model: s.model ?? "" });
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const current = readSettings();
    writeSettings({
      geminiApiKey: form.apiKey.trim() || null,
      model: form.model.trim() || null,
      reducedMotion: current.reducedMotion,
    });
    setSaved(true);
    onSaved?.();
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <details className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
      <summary className="cursor-pointer text-sm font-medium">
        AI settings (your Gemini API key)
      </summary>
      <form onSubmit={handleSave} className="mt-3 flex flex-col gap-3">
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Bring your own key. It is stored only on this device and sent to our server solely to
          generate your plan — never saved on a server.
        </p>
        <div>
          <Label htmlFor="apiKey">Gemini API key</Label>
          <Input
            id="apiKey"
            type="password"
            autoComplete="off"
            value={form.apiKey}
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
            placeholder="AIza…"
          />
        </div>
        <div>
          <Label htmlFor="model">Model (optional override)</Label>
          <Input
            id="model"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            placeholder="gemini-3.8-flash"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="ghost">
            Save settings
          </Button>
          {saved ? (
            <span role="status" className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Saved ✓
            </span>
          ) : null}
        </div>
      </form>
    </details>
  );
}
