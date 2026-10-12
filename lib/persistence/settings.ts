import { TravelerSettingsSchema, type TravelerSettings } from "@/lib/domain/schema";

const STORAGE_KEY = "roam-board:settings";

const DEFAULTS: TravelerSettings = {
  geminiApiKey: null,
  model: null,
  reducedMotion: false,
};

/** Read on-device traveler settings (BYOK key, model override, reduced-motion). */
export function readSettings(): TravelerSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = TravelerSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist settings. Returns false if storage is unavailable. */
export function writeSettings(settings: TravelerSettings): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function hasApiKey(): boolean {
  return Boolean(readSettings().geminiApiKey);
}
