"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, SkipForward, Settings, X } from "lucide-react";
import HudPanel from "./HudPanel";

type Mode = "work" | "break" | "long";

const CIRCUMFERENCE = 2 * Math.PI * 40; // radius 40

function playBeep(workComplete: boolean) {
  try {
    const ctx = new AudioContext();
    const schedule = workComplete
      ? [{ f: 523, t: 0 }, { f: 659, t: 0.15 }, { f: 784, t: 0.30 }]
      : [{ f: 784, t: 0 }, { f: 523, t: 0.20 }];
    schedule.forEach(({ f, t }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime + t);
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.45);
    });
  } catch {}
}

function loadCfg() {
  if (typeof window === "undefined") return { work: 25, brk: 5, long: 15, every: 4 };
  try {
    return JSON.parse(localStorage.getItem("hud-pomodoro-cfg") ?? "null") ??
      { work: 25, brk: 5, long: 15, every: 4 };
  } catch { return { work: 25, brk: 5, long: 15, every: 4 }; }
}

function saveCfg(c: { work: number; brk: number; long: number; every: number }) {
  localStorage.setItem("hud-pomodoro-cfg", JSON.stringify(c));
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Pomodoro() {
  const [cfg, setCfg]           = useState(loadCfg);
  const [mode, setMode]         = useState<Mode>("work");
  const [running, setRunning]   = useState(false);
  const [cycle, setCycle]       = useState(0);       // completed work cycles
  const [remaining, setRemaining] = useState(cfg.work * 60);
  const [showCfg, setShowCfg]   = useState(false);
  const endTimeRef              = useRef<number | null>(null);
  const rafRef                  = useRef<number>(0);

  // Draft config in the settings panel
  const [dWork, setDWork]   = useState(String(cfg.work));
  const [dBrk, setDBrk]    = useState(String(cfg.brk));
  const [dLong, setDLong]   = useState(String(cfg.long));
  const [dEvery, setDEvery] = useState(String(cfg.every));

  const totalSecs = mode === "work" ? cfg.work * 60 : mode === "break" ? cfg.brk * 60 : cfg.long * 60;
  const progress  = remaining / totalSecs;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const modeColor = mode === "work" ? "cyan" : "emerald";

  // rAF-based tick (drift-resistant)
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (!endTimeRef.current) return;
      const left = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        endTimeRef.current = null;
        // auto-advance
        setCycle(prev => {
          const newCycle = mode === "work" ? prev + 1 : prev;
          const nextMode: Mode = mode !== "work" ? "work" :
            (newCycle % cfg.every === 0 ? "long" : "break");
          const nextSecs = nextMode === "work" ? cfg.work * 60
            : nextMode === "break" ? cfg.brk * 60 : cfg.long * 60;
          setMode(nextMode);
          setRemaining(nextSecs);
          playBeep(mode === "work");
          return newCycle;
        });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, mode, cfg]);

  const startPause = () => {
    if (running) {
      cancelAnimationFrame(rafRef.current);
      endTimeRef.current = null;
      setRunning(false);
    } else {
      endTimeRef.current = Date.now() + remaining * 1000;
      setRunning(true);
    }
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    endTimeRef.current = null;
    setRunning(false);
    setRemaining(totalSecs);
  };

  const skip = () => {
    cancelAnimationFrame(rafRef.current);
    endTimeRef.current = null;
    setRunning(false);
    const nextMode: Mode = mode !== "work" ? "work"
      : ((cycle + 1) % cfg.every === 0 ? "long" : "break");
    const nextSecs = nextMode === "work" ? cfg.work * 60
      : nextMode === "break" ? cfg.brk * 60 : cfg.long * 60;
    if (mode === "work") setCycle(c => c + 1);
    setMode(nextMode);
    setRemaining(nextSecs);
  };

  // ARIA tool: start/stop via CustomEvents
  useEffect(() => {
    const handleStart = (e: Event) => {
      const minutes = Math.max(1, (e as CustomEvent).detail?.minutes ?? cfg.work);
      const secs    = minutes * 60;
      cancelAnimationFrame(rafRef.current);
      setMode("work");
      setRemaining(secs);
      endTimeRef.current = Date.now() + secs * 1000;
      setRunning(true);
      setShowCfg(false);
    };
    const handleStop = () => {
      cancelAnimationFrame(rafRef.current);
      endTimeRef.current = null;
      setRunning(false);
    };
    window.addEventListener("aria:pomodoro_start", handleStart);
    window.addEventListener("aria:pomodoro_stop",  handleStop);
    return () => {
      window.removeEventListener("aria:pomodoro_start", handleStart);
      window.removeEventListener("aria:pomodoro_stop",  handleStop);
    };
  }, [cfg.work]);

  const applyConfig = () => {
    const next = {
      work:  Math.max(1, parseInt(dWork)  || 25),
      brk:   Math.max(1, parseInt(dBrk)   || 5),
      long:  Math.max(1, parseInt(dLong)  || 15),
      every: Math.max(1, parseInt(dEvery) || 4),
    };
    setCfg(next);
    saveCfg(next);
    setMode("work");
    setRemaining(next.work * 60);
    setRunning(false);
    endTimeRef.current = null;
    setShowCfg(false);
  };

  const actions = (
    <div className="flex items-center gap-2">
      <span className="text-[8px] text-accent-400/30 tracking-widest">🍅 {cycle}</span>
      <button onClick={() => setShowCfg(v => !v)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5">
        <Settings size={11} />
      </button>
    </div>
  );

  const inp = "w-12 bg-transparent border border-accent-500/15 text-[9px] text-accent-400/60 px-1.5 py-0.5 text-center focus:outline-none focus:border-accent-400/40";

  return (
    <HudPanel title="POMODORO" icon={<Timer size={10} />} actions={actions}>
      {showCfg ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Work (min)",   val: dWork,  set: setDWork  },
              { label: "Break (min)",  val: dBrk,   set: setDBrk   },
              { label: "Long (min)",   val: dLong,  set: setDLong  },
              { label: "Long every",   val: dEvery, set: setDEvery },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <div className="text-[7px] text-accent-400/25 tracking-[0.2em] uppercase mb-1">{label}</div>
                <input type="number" value={val} onChange={e => set(e.target.value)} className={inp + " w-full"} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={applyConfig} className="flex-1 py-1.5 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 text-[8px] tracking-widest uppercase transition-colors">
              Apply
            </button>
            <button onClick={() => setShowCfg(false)} className="px-3 py-1.5 text-accent-400/30 hover:text-accent-400/60 transition-colors">
              <X size={11} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* SVG Ring */}
          <div className="relative">
            <svg width="110" height="110" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                style={{ stroke: mode === "work" ? "var(--ac-08)" : "rgba(52,211,153,0.08)" }}
                strokeWidth="6"
              />
              {/* Progress */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                style={{
                  stroke: mode === "work" ? "var(--ac-60)" : "rgba(52,211,153,0.6)",
                  transition: running ? "stroke-dashoffset 0.9s linear" : "none",
                }}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 50 50)"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold font-mono tracking-widest ${mode === "work" ? "text-accent-300" : "text-emerald-300"}`}>
                {fmtTime(remaining)}
              </span>
              <span className={`text-[7px] tracking-[0.25em] uppercase mt-0.5 ${mode === "work" ? "text-accent-400/40" : "text-emerald-400/40"}`}>
                {mode === "work" ? "FOCUS" : mode === "break" ? "BREAK" : "LONG BREAK"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button onClick={reset} className="text-accent-400/25 hover:text-accent-400/60 transition-colors p-1">
              <RotateCcw size={13} />
            </button>
            <button
              onClick={startPause}
              className={`w-9 h-9 border flex items-center justify-center transition-all ${
                mode === "work"
                  ? "border-accent-400/40 hover:bg-accent-400/10 text-accent-300"
                  : "border-emerald-400/40 hover:bg-emerald-400/10 text-emerald-300"
              }`}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={skip} className="text-accent-400/25 hover:text-accent-400/60 transition-colors p-1">
              <SkipForward size={13} />
            </button>
          </div>
        </div>
      )}
    </HudPanel>
  );
}
