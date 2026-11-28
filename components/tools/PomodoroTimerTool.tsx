"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  EMPTY_STATS,
  LIMITS,
  PHASE_IDS,
  PHASE_META,
  PRESETS,
  addSession,
  dayKey,
  formatClock,
  formatMinutes,
  nextPhase,
  phaseSeconds,
  sanitizeSettings,
  sanitizeStats,
} from "@/lib/pomodoro-engine";
import type { PhaseId, PomodoroSettings, PomodoroStats } from "@/lib/pomodoro-engine";

const SETTINGS_KEY = "tgp-pomodoro-settings";
const STATS_KEY = "tgp-pomodoro-stats";
const RADIUS = 90;
const CIRC = 2 * Math.PI * RADIUS;

const PHASE_COLOR = {
  focus: "text-brand-600",
  short: "text-emerald-500",
  long: "text-sky-500",
} as const;

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be blocked in private mode */
  }
}

function beep() {
  try {
    const ctx = new window.AudioContext();
    const notes = [880, 660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
    window.setTimeout(() => {
      void ctx.close();
    }, 1200);
  } catch {
    /* audio may be blocked by the browser */
  }
}

function notify(title: string, body: string) {
  try {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      }
    }
  } catch {
    /* some mobile browsers do not allow the constructor */
  }
}

function Stepper(props: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  const { label, unit, value, min, max, step, onChange } = props;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {value} {unit}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary size-9 px-0"
          aria-label={"Decrease " + label}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums text-slate-900 dark:text-white">
          {value}
        </span>
        <button
          type="button"
          className="btn-secondary size-9 px-0"
          aria-label={"Increase " + label}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function PomodoroTimerTool() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<PhaseId>("focus");
  const [focusDone, setFocusDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(DEFAULT_SETTINGS.focusMin * 60);
  const [stats, setStats] = useState<PomodoroStats>(EMPTY_STATS);
  const [task, setTask] = useState("");
  const [notice, setNotice] = useState("");
  const [notifyState, setNotifyState] = useState("unsupported");
  const endAtRef = useRef(0);
  const baseTitle = useRef("");

  /* Load saved settings and today's stats once, after hydration. */
  useEffect(() => {
    baseTitle.current = document.title;
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw !== null) {
        const s = sanitizeSettings(JSON.parse(raw));
        setSettings(s);
        setRemaining(phaseSeconds("focus", s));
      }
      const rawStats = window.localStorage.getItem(STATS_KEY);
      if (rawStats !== null) {
        setStats(sanitizeStats(JSON.parse(rawStats), dayKey(new Date())));
      }
    } catch {
      /* ignore corrupt saved data */
    }
    if ("Notification" in window) {
      setNotifyState(Notification.permission);
    }
  }, []);

  const finish = useCallback(() => {
    const step = nextPhase(phase, focusDone, settings);
    if (phase === "focus") {
      const updated = addSession(stats, settings.focusMin, dayKey(new Date()));
      setStats(updated);
      save(STATS_KEY, updated);
    }
    const message =
      phase === "focus" ? "Focus session complete. Time for a break." : "Break over. Back to focus.";
    setNotice(message);
    if (settings.sound) beep();
    notify("ToolGlobe Pomodoro", message);
    setPhase(step.phase);
    setFocusDone(step.focusDone);
    const secs = phaseSeconds(step.phase, settings);
    setRemaining(secs);
    if (settings.autoStart) {
      endAtRef.current = Date.now() + secs * 1000;
    } else {
      endAtRef.current = 0;
      setRunning(false);
    }
  }, [phase, focusDone, settings, stats]);

  /* The countdown is computed from a fixed end time, not by counting
     ticks, so it stays correct when the tab is throttled. */
  useEffect(() => {
    if (running) {
      const id = window.setInterval(() => {
        if (endAtRef.current === 0) return;
        const left = Math.ceil((endAtRef.current - Date.now()) / 1000);
        if (left > 0) setRemaining(left);
        else finish();
      }, 250);
      return () => window.clearInterval(id);
    }
    return undefined;
  }, [running, finish]);

  /* Show the countdown in the browser tab title while running. */
  useEffect(() => {
    if (running) {
      document.title = formatClock(remaining) + " - " + PHASE_META[phase].label;
    } else if (baseTitle.current !== "") {
      document.title = baseTitle.current;
    }
  }, [running, remaining, phase]);

  useEffect(() => {
    return () => {
      if (baseTitle.current !== "") document.title = baseTitle.current;
    };
  }, []);

  const start = () => {
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  const pause = () => {
    endAtRef.current = 0;
    setRunning(false);
  };

  const reset = () => {
    pause();
    setRemaining(phaseSeconds(phase, settings));
  };

  const pickPhase = (id: PhaseId) => {
    pause();
    setPhase(id);
    setRemaining(phaseSeconds(id, settings));
  };

  const skip = () => {
    if (phase === "long") setFocusDone(0);
    pickPhase(phase === "focus" ? "short" : "focus");
  };

  const applySettings = (next: PomodoroSettings) => {
    setSettings(next);
    save(SETTINGS_KEY, next);
    if (!running) setRemaining(phaseSeconds(phase, next));
  };

  const clearStats = () => {
    const empty: PomodoroStats = { day: dayKey(new Date()), sessions: 0, minutes: 0 };
    setStats(empty);
    save(STATS_KEY, empty);
  };

  const askNotify = () => {
    if (!("Notification" in window)) return;
    void Notification.requestPermission().then((p) => setNotifyState(p));
  };

  const total = phaseSeconds(phase, settings);
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;
  const round = (focusDone % settings.cycles) + 1;

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-8">
        <div className="flex flex-wrap justify-center gap-2">
          {PHASE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={phase === id}
              className={phase === id ? "btn-primary" : "btn-secondary"}
              onClick={() => pickPhase(id)}
            >
              {PHASE_META[id].label}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-6 size-64 sm:size-72">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden="true">
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              className="stroke-slate-200 dark:stroke-slate-700"
            />
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * progress}
              className={PHASE_COLOR[phase] + " transition-[stroke-dashoffset] duration-300"}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p
              role="timer"
              className="text-5xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-6xl dark:text-white"
            >
              {formatClock(remaining)}
            </p>
            <p className={"mt-1 text-sm font-semibold " + PHASE_COLOR[phase]}>{PHASE_META[phase].label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {phase === "focus"
                ? "Round " + String(round) + " of " + String(settings.cycles)
                : PHASE_META[phase].hint}
            </p>
          </div>
        </div>

        {task !== "" && (
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Working on: <span className="font-semibold text-slate-900 dark:text-white">{task}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {running ? (
            <button type="button" className="btn-primary min-w-28" onClick={pause}>
              Pause
            </button>
          ) : (
            <button type="button" className="btn-primary min-w-28" onClick={start}>
              Start
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={reset}>
            Reset
          </button>
          <button type="button" className="btn-ghost" onClick={skip}>
            Skip
          </button>
        </div>

        <div className="mx-auto mt-6 max-w-md">
          <label htmlFor="pomodoro-task" className="text-sm font-semibold text-slate-900 dark:text-white">
            What are you focusing on?
          </label>
          <input
            id="pomodoro-task"
            type="text"
            className="input mt-2"
            maxLength={80}
            placeholder="One task, for example: write the report intro"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {notice}
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Today</h2>
          <button type="button" className="btn-ghost" onClick={clearStats}>
            Clear count
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
            <p className="text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {stats.sessions}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Focus sessions finished</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {formatMinutes(stats.minutes)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Time focused</p>
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Pick a preset or fine-tune each length. Changes are saved on this device only.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip"
              onClick={() =>
                applySettings({
                  ...settings,
                  focusMin: p.focusMin,
                  shortMin: p.shortMin,
                  longMin: p.longMin,
                  cycles: p.cycles,
                })
              }
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stepper
            label="Focus length"
            unit="min"
            value={settings.focusMin}
            min={LIMITS.focusMin.min}
            max={LIMITS.focusMin.max}
            step={5}
            onChange={(n) => applySettings({ ...settings, focusMin: n })}
          />
          <Stepper
            label="Short break"
            unit="min"
            value={settings.shortMin}
            min={LIMITS.shortMin.min}
            max={LIMITS.shortMin.max}
            step={1}
            onChange={(n) => applySettings({ ...settings, shortMin: n })}
          />
          <Stepper
            label="Long break"
            unit="min"
            value={settings.longMin}
            min={LIMITS.longMin.min}
            max={LIMITS.longMin.max}
            step={5}
            onChange={(n) => applySettings({ ...settings, longMin: n })}
          />
          <Stepper
            label="Rounds before long break"
            unit="rounds"
            value={settings.cycles}
            min={LIMITS.cycles.min}
            max={LIMITS.cycles.max}
            step={1}
            onChange={(n) => applySettings({ ...settings, cycles: n })}
          />
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="size-4 accent-brand-600"
              checked={settings.autoStart}
              onChange={(e) => applySettings({ ...settings, autoStart: e.target.checked })}
            />
            Start the next phase automatically
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="size-4 accent-brand-600"
              checked={settings.sound}
              onChange={(e) => applySettings({ ...settings, sound: e.target.checked })}
            />
            Play a sound when a phase ends
          </label>
          {notifyState === "default" && (
            <button type="button" className="btn-secondary" onClick={askNotify}>
              Enable browser notifications
            </button>
          )}
          {notifyState === "granted" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Browser notifications are on.</p>
          )}
          {notifyState === "denied" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Notifications are blocked in your browser settings. The sound and tab title still work.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PomodoroTimerTool;
