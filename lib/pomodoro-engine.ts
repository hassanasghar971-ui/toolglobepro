/* Pure helpers for the Pomodoro timer. No DOM access here. */

export const PHASE_IDS = ["focus", "short", "long"] as const;
export type PhaseId = (typeof PHASE_IDS)[number];

export interface PomodoroSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  cycles: number;
  autoStart: boolean;
  sound: boolean;
}

export interface PomodoroStats {
  day: string;
  sessions: number;
  minutes: number;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  cycles: 4,
  autoStart: false,
  sound: true,
};

export const EMPTY_STATS: PomodoroStats = { day: "", sessions: 0, minutes: 0 };

export const LIMITS = {
  focusMin: { min: 1, max: 180 },
  shortMin: { min: 1, max: 60 },
  longMin: { min: 1, max: 120 },
  cycles: { min: 2, max: 8 },
} as const;

export const PRESETS = [
  { id: "classic", name: "Classic 25/5", focusMin: 25, shortMin: 5, longMin: 15, cycles: 4 },
  { id: "short", name: "Short 15/3", focusMin: 15, shortMin: 3, longMin: 15, cycles: 4 },
  { id: "balanced", name: "Balanced 52/17", focusMin: 52, shortMin: 17, longMin: 30, cycles: 3 },
  { id: "deep", name: "Deep work 90/20", focusMin: 90, shortMin: 20, longMin: 30, cycles: 2 },
] as const;

export const PHASE_META = {
  focus: { label: "Focus", hint: "Work on one task only" },
  short: { label: "Short break", hint: "Stand up, stretch, drink water" },
  long: { label: "Long break", hint: "Step away and fully recharge" },
} as const;

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function sanitizeSettings(raw: unknown): PomodoroSettings {
  const d = DEFAULT_SETTINGS;
  if (typeof raw !== "object") return { ...d };
  if (raw === null) return { ...d };
  const r = raw as Record<string, unknown>;
  return {
    focusMin: clampInt(r["focusMin"], LIMITS.focusMin.min, LIMITS.focusMin.max, d.focusMin),
    shortMin: clampInt(r["shortMin"], LIMITS.shortMin.min, LIMITS.shortMin.max, d.shortMin),
    longMin: clampInt(r["longMin"], LIMITS.longMin.min, LIMITS.longMin.max, d.longMin),
    cycles: clampInt(r["cycles"], LIMITS.cycles.min, LIMITS.cycles.max, d.cycles),
    autoStart: typeof r["autoStart"] === "boolean" ? r["autoStart"] : d.autoStart,
    sound: typeof r["sound"] === "boolean" ? r["sound"] : d.sound,
  };
}

export function dayKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return String(d.getFullYear()) + "-" + m + "-" + day;
}

export function sanitizeStats(raw: unknown, today: string): PomodoroStats {
  const empty: PomodoroStats = { day: today, sessions: 0, minutes: 0 };
  if (typeof raw !== "object") return empty;
  if (raw === null) return empty;
  const r = raw as Record<string, unknown>;
  if (r["day"] !== today) return empty;
  return {
    day: today,
    sessions: clampInt(r["sessions"], 0, 100000, 0),
    minutes: clampInt(r["minutes"], 0, 1000000, 0),
  };
}

export function addSession(stats: PomodoroStats, minutes: number, today: string): PomodoroStats {
  const base = stats.day === today ? stats : { day: today, sessions: 0, minutes: 0 };
  return { day: today, sessions: base.sessions + 1, minutes: base.minutes + minutes };
}

export function phaseSeconds(phase: PhaseId, settings: PomodoroSettings) {
  if (phase === "focus") return settings.focusMin * 60;
  if (phase === "short") return settings.shortMin * 60;
  return settings.longMin * 60;
}

/* After a finished focus session: a long break every `cycles` rounds,
   otherwise a short break. After any break: back to focus. */
export function nextPhase(phase: PhaseId, focusDone: number, settings: PomodoroSettings) {
  if (phase === "focus") {
    const done = focusDone + 1;
    const isLong = done % settings.cycles === 0;
    return { phase: (isLong ? "long" : "short") as PhaseId, focusDone: done };
  }
  return { phase: "focus" as PhaseId, focusDone: phase === "long" ? 0 : focusDone };
}

export function formatClock(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? String(h) + ":" + mm + ":" + ss : mm + ":" + ss;
}

export function formatMinutes(total: number) {
  const t = Math.max(0, Math.round(total));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h === 0) return String(m) + " min";
  return String(h) + " h " + String(m) + " min";
}
