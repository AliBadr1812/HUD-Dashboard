"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, MicOff, Volume2, VolumeX, PanelRight, Maximize2 } from "lucide-react";
import { useHudShortcut } from "../hooks/useHudShortcut";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToolCall = { name: string; label: string; result?: string };
type Message  = { role: "user" | "assistant"; content: string; streaming?: boolean; toolCalls?: ToolCall[] };
type AriaMode = "closed" | "fullscreen" | "copilot";

// ── Tools ─────────────────────────────────────────────────────────────────────

const ALL_TOOLS = [
  { name: "get_weather",        label: "weather"    },
  { name: "get_prayer_times",   label: "prayer"     },
  { name: "github_summary",     label: "github"     },
  { name: "get_spotify_track",  label: "spotify"    },
  { name: "pomodoro_control",   label: "pomodoro"   },
  { name: "mood_log",           label: "mood"       },
  { name: "scratchpad_write",   label: "scratchpad" },
  { name: "crypto_price",       label: "crypto"     },
  { name: "news_headlines",     label: "news"       },
  { name: "morning_briefing",   label: "briefing"   },
  { name: "habit_add",          label: "habits"     },
  { name: "calendar_add_event", label: "calendar"   },
];

// ── CSS keyframes — colors via CSS variables so themes apply ─────────────────

const NEXUS_CSS = `
  @keyframes nx-cw  { to { transform: rotate(360deg); } }
  @keyframes nx-ccw { to { transform: rotate(-360deg); } }
  @keyframes nx-ripple {
    0%   { transform: scale(0.25); opacity: 0.7; }
    100% { transform: scale(9);    opacity: 0;   }
  }
  @keyframes nx-core {
    0%,100% { transform: scale(1);    opacity: 0.65; }
    50%      { transform: scale(1.45); opacity: 1;    }
  }
  @keyframes nx-glow1 {
    0%,100% { transform: scale(1);    opacity: 0.14; }
    50%      { transform: scale(1.3);  opacity: 0.5;  }
  }
  @keyframes nx-glow2 {
    0%,100% { transform: scale(1);    opacity: 0.05; }
    50%      { transform: scale(1.35); opacity: 0.2;  }
  }
  @keyframes nx-cursor { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes nx-in {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:none;            }
  }
`;

// ── NexusCore — all colors via CSS variables ──────────────────────────────────

function NexusCore({ size = 120, active = false }: { size?: number; active?: boolean }) {
  const r3   = size * 0.46;
  const r2   = size * 0.30;
  const r1   = size * 0.16;
  const cR   = size * 0.09;
  const g1R  = size * 0.16;
  const g2R  = size * 0.28;
  const ripR = size * 0.14;

  const dotSz = (f: number) => Math.max(2, Math.round(size * f));

  const sp1 = active ? "4s"    : "9s";
  const sp2 = active ? "2.5s"  : "6s";
  const sp3 = active ? "1.4s"  : "3.5s";
  const rp  = active ? "1.8s"  : "3.2s";
  const cp  = active ? "0.75s" : "2s";
  const gp  = active ? "0.85s" : "2.4s";

  const ripDelay = (f: number) => `${parseFloat(rp) * f}s`;

  const abs: React.CSSProperties = { position: "absolute" };

  const centered = (d: number): React.CSSProperties => ({
    ...abs,
    top: "50%", left: "50%",
    marginTop: -(d / 2), marginLeft: -(d / 2),
    width: d, height: d,
    borderRadius: "50%",
  });

  const ringStyle = (r: number, dir: string, speed: string, clr: string): React.CSSProperties => ({
    ...abs,
    top: "50%", left: "50%",
    marginTop: -r, marginLeft: -r,
    width: r * 2, height: r * 2,
    borderRadius: "50%",
    border: `0.5px solid ${clr}`,
    animation: `${dir} ${speed} linear infinite`,
  });

  const dotStyle = (sz: number, pos: "t" | "b", glow: boolean, dim?: boolean): React.CSSProperties => ({
    ...abs,
    width: sz, height: sz,
    borderRadius: "50%",
    background: "var(--ac-solid)",
    left: "50%", marginLeft: -(sz / 2),
    ...(pos === "t" ? { top: -(sz / 2) } : { bottom: -(sz / 2) }),
    ...(glow ? { boxShadow: `0 0 ${sz * 2}px var(--ac-solid)` } : {}),
    ...(dim ? { opacity: 0.5 } : {}),
  });

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Ripple 1 */}
      <div style={{ ...centered(ripR * 2), border: "1px solid var(--ac-solid)", animation: `nx-ripple ${rp} ease-out infinite` }} />
      {/* Ripple 2 */}
      <div style={{ ...centered(ripR * 2), border: "1px solid var(--ac-solid)", animation: `nx-ripple ${rp} ease-out ${ripDelay(-0.5)} infinite` }} />
      {/* Ripple 3 — active only */}
      {active && (
        <div style={{ ...centered(ripR * 2), border: "1px solid var(--ac-solid)", animation: `nx-ripple ${rp} ease-out ${ripDelay(-0.8)} infinite` }} />
      )}

      {/* Outer glow layer */}
      <div style={{ ...centered(g2R * 2), background: "var(--ac-solid)", animation: `nx-glow2 ${gp} ease-in-out -0.5s infinite` }} />
      {/* Inner glow layer */}
      <div style={{ ...centered(g1R * 2), background: "var(--ac-solid)", animation: `nx-glow1 ${cp} ease-in-out infinite` }} />

      {/* Outer ring */}
      <div style={ringStyle(r3, "nx-cw", sp1, "var(--ac-20)")}>
        <div style={dotStyle(dotSz(0.065), "t", true)} />
        <div style={dotStyle(dotSz(0.033), "b", false, true)} />
      </div>

      {/* Mid ring */}
      <div style={ringStyle(r2, "nx-ccw", sp2, "var(--ac-30)")}>
        <div style={dotStyle(dotSz(0.055), "b", true)} />
        <div style={dotStyle(dotSz(0.028), "t", false, true)} />
      </div>

      {/* Inner ring */}
      <div style={ringStyle(r1, "nx-cw", sp3, "var(--ac-45)")}>
        <div style={dotStyle(dotSz(0.045), "t", true)} />
      </div>

      {/* Core */}
      <div style={{
        ...centered(cR * 2),
        background: "var(--ac-solid)",
        animation: `nx-core ${cp} ease-in-out infinite`,
        boxShadow: active
          ? `0 0 ${Math.round(cR * 3)}px var(--ac-solid), 0 0 ${Math.round(cR * 1.5)}px #fff5`
          : `0 0 ${Math.round(cR * 2)}px var(--ac-70)`,
      }} />
    </div>
  );
}

// ── NexusMessage ──────────────────────────────────────────────────────────────

function NexusMessage({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === "user";
  const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={`flex items-start gap-4 ${isUser ? "flex-row-reverse" : ""}`}
      style={{ animation: `nx-in 0.3s ease ${index * 0.04}s both` }}
    >
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0, marginTop: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
        ...(isUser
          ? { background: "#ffffff06", border: "0.5px solid #ffffff15" }
          : { background: "var(--ac-04)", border: "0.5px solid var(--ac-20)" }
        ),
      }}>
        {isUser ? (
          <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.05em", color: "#ffffff30" }}>ME</span>
        ) : (
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "var(--ac-solid)",
            animation: `nx-core ${msg.streaming ? "0.8s" : "2s"} ease-in-out infinite`,
            boxShadow: "0 0 8px var(--ac-solid)",
          }} />
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Tool calls */}
        {(msg.toolCalls ?? []).map((tc, i) => (
          <div key={i} className="flex items-center gap-2 font-mono text-xs" style={{ color: "var(--ac-40)" }}>
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: tc.result ? "var(--ac-solid)" : "var(--ac-30)",
              animation: !tc.result ? "nx-cursor 0.8s step-end infinite" : "none",
              boxShadow: tc.result ? "0 0 6px var(--ac-solid)" : "none",
            }} />
            <span>{tc.label}</span>
            {tc.result && (
              <>
                <span style={{ color: "var(--ac-25)" }}>→</span>
                <span style={{ color: "var(--color-accent-200)" }}>{tc.result}</span>
              </>
            )}
          </div>
        ))}

        {/* Bubble */}
        {msg.content && (
          <div
            className="text-[14px] leading-relaxed font-mono whitespace-pre-wrap px-4 py-3"
            style={isUser
              ? { color: "#ffffff45", background: "#ffffff05" }
              : { color: "var(--color-accent-100)", background: "var(--ac-04)", borderLeft: "2px solid var(--ac-25)" }
            }
          >
            {msg.content}
            {msg.streaming && !msg.toolCalls?.some(tc => !tc.result) && (
              <span className="inline-block w-[7px] h-[14px] ml-1 align-middle"
                style={{ background: "var(--ac-solid)", animation: "nx-cursor 0.7s step-end infinite" }} />
            )}
          </div>
        )}

        <div className="text-[10px] font-mono" style={{ color: "#ffffff18" }}>{ts}</div>
      </div>
    </div>
  );
}

// ── NexusCopilotMessage ───────────────────────────────────────────────────────

function NexusCopilotMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className="flex flex-col gap-1">
      {(msg.toolCalls ?? []).map((tc, i) => (
        <div key={i} className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: "var(--ac-30)" }}>
          <span style={{
            display: "inline-block", width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
            background: tc.result ? "var(--ac-solid)" : "var(--ac-25)",
          }} />
          <span>{tc.label}</span>
          {tc.result && <span style={{ color: "var(--color-accent-200)", marginLeft: 3 }}>{tc.result}</span>}
        </div>
      ))}
      {msg.content && (
        <div
          className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
          style={isUser
            ? { color: "#ffffff30", textAlign: "right" }
            : { color: "var(--color-accent-200)", paddingLeft: 10, borderLeft: "2px solid var(--ac-20)" }
          }
        >
          {msg.content}
          {msg.streaming && !msg.toolCalls?.some(tc => !tc.result) && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle"
              style={{ background: "var(--ac-solid)", animation: "nx-cursor 0.7s step-end infinite" }} />
          )}
        </div>
      )}
    </div>
  );
}

// ── NexusToolsPanel ───────────────────────────────────────────────────────────

function NexusToolsPanel({ messages }: { messages: Message[] }) {
  const used = new Set(
    messages.flatMap(m => (m.toolCalls ?? []).filter(tc => tc.result).map(tc => tc.name))
  );
  return (
    <div style={{ width: 160, flexShrink: 0, borderLeft: "0.5px solid var(--ac-07)", padding: "24px 16px" }}>
      <div className="font-mono text-[9px] tracking-[0.22em] mb-5" style={{ color: "var(--ac-20)" }}>MODULES</div>
      <div className="flex flex-col gap-2.5">
        {ALL_TOOLS.map(t => (
          <div key={t.name} className="flex items-center gap-2 font-mono text-[11px] tracking-wide"
            style={{ color: used.has(t.name) ? "var(--ac-solid)" : "var(--ac-20)" }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: used.has(t.name) ? "var(--ac-solid)" : "var(--ac-10)",
              boxShadow: used.has(t.name) ? "0 0 6px var(--ac-solid)" : "none",
            }} />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NexusInput ────────────────────────────────────────────────────────────────

function NexusInput({
  inputRef, input, setInput, streaming, booting, listening,
  toggleListening, send, abort, compact,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  input: string; setInput: (v: string) => void;
  streaming: boolean; booting: boolean; listening: boolean;
  toggleListening: () => void; send: () => void; abort: () => void;
  compact?: boolean;
}) {
  const maxH = compact ? 120 : 200;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [input, inputRef, maxH]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const borderClr = listening ? "var(--ac-60)" : streaming ? "var(--ac-30)" : "var(--ac-20)";

  return (
    <div
      className="flex items-end gap-3"
      style={{
        border: `0.5px solid ${borderClr}`,
        background: "#0a1822",
        padding: compact ? "10px 14px" : "13px 18px",
        transition: "border-color 0.35s",
      }}
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        placeholder={compact ? "Ask ARIA…" : "Ask ARIA anything…  (Enter to send)"}
        rows={1}
        disabled={streaming || booting}
        className="flex-1 bg-transparent font-mono focus:outline-none resize-none leading-relaxed disabled:opacity-40 text-[14px]"
        style={{ color: "var(--color-accent-100)", caretColor: "var(--ac-solid)", maxHeight: maxH, overflowY: "auto" }}
      />
      <div className="flex items-center gap-2 shrink-0 pb-0.5">
        {streaming && (
          <button onClick={abort} className="text-[10px] font-mono tracking-widest uppercase transition-colors" style={{ color: "#ff6b6b77" }}>
            ABORT
          </button>
        )}
        <button
          onClick={toggleListening}
          disabled={streaming || booting}
          className="disabled:opacity-20 transition-colors"
          style={{ color: listening ? "var(--ac-solid)" : "var(--ac-30)" }}
        >
          {listening ? <MicOff size={compact ? 13 : 15} /> : <Mic size={compact ? 13 : 15} />}
        </button>
        <button
          onClick={send}
          disabled={!input.trim() || streaming || booting}
          className="text-[10px] font-mono tracking-widest uppercase px-3 py-1.5 disabled:opacity-20 transition-all"
          style={{ background: "var(--ac-10)", border: "0.5px solid var(--ac-25)", color: "var(--ac-solid)" }}
        >
          {compact ? "↑" : "SEND"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AriaModal() {
  const [mode, setMode]           = useState<AriaMode>("closed");
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [booting, setBooting]     = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ── TTS ───────────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/\*\*?([^*]+)\*\*?/g, "$1")
      .replace(/`[^`]+`/g, "")
      .replace(/#+\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
    if (!clean) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate  = 1.05;
    utter.pitch = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v => v.name === "Samantha")
      ?? voices.find(v => v.name === "Daniel")
      ?? voices.find(v => v.lang.startsWith("en") && !v.name.includes("Google"))
      ?? voices[0];
    if (pick) utter.voice = pick;
    window.speechSynthesis.speak(utter);
  }, [voiceEnabled]);

  useEffect(() => {
    if (mode === "closed") window.speechSynthesis?.cancel();
  }, [mode]);

  // ── STT ───────────────────────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser."); return; }
    const rec: SpeechRecognition = new SR();
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening]);

  // ── Open ──────────────────────────────────────────────────────────────────────
  const openAs = (newMode: "fullscreen" | "copilot") => {
    setMode(newMode);
    if (messages.length === 0) {
      setBooting(true);
      setTimeout(() => {
        setMessages([{ role: "assistant", content: "ARIA online. How can I assist you, Kirfa?" }]);
        setBooting(false);
      }, 900);
    }
  };

  useHudShortcut("hud:open-aria", () => openAs("fullscreen"));

  // ── Escape closes fullscreen ──────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "fullscreen") return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setMode("closed"); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Focus on open ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "closed" && !booting) setTimeout(() => inputRef.current?.focus(), 60);
  }, [mode, booting]);

  // ── Send ──────────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const context = await (async () => {
      try {
        const [spotifyRes, weatherRes, prayerRes, githubRes] = await Promise.all([
          fetch("/api/spotify").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/weather").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/prayer").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/github").then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        const now = new Date().toLocaleString("en-GB", {
          timeZone: "Europe/Amsterdam",
          weekday: "long", year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        const lines: string[] = [`Time: ${now} (Amsterdam)`];

        if (spotifyRes) {
          lines.push(spotifyRes.playing
            ? `Spotify: Playing "${spotifyRes.trackName}" by ${spotifyRes.artist} from "${spotifyRes.album}"`
            : "Spotify: Not currently playing");
        }
        if (weatherRes && !weatherRes.error) {
          lines.push(`Weather: ${weatherRes.temp}°C (feels ${weatherRes.feelsLike}°C), ${weatherRes.condition}, humidity ${weatherRes.humidity}%, wind ${weatherRes.wind} km/h ${weatherRes.windDir}`);
        }
        if (prayerRes && !prayerRes.error) {
          const t = prayerRes;
          const prayers = [
            { name: "Fajr", time: t.fajr }, { name: "Dhuhr", time: t.dhuhr },
            { name: "Asr",  time: t.asr  }, { name: "Maghrib", time: t.maghrib },
            { name: "Isha", time: t.isha  },
          ];
          const nowDate = new Date();
          const next = prayers.find(p => {
            const [h, m] = (p.time ?? "").split(":").map(Number);
            const d = new Date(); d.setHours(h, m, 0, 0);
            return d > nowDate;
          });
          if (next) lines.push(`Next prayer: ${next.name} at ${next.time}`);
          lines.push(`Prayers: Fajr ${t.fajr} · Dhuhr ${t.dhuhr} · Asr ${t.asr} · Maghrib ${t.maghrib} · Isha ${t.isha}`);
        }
        if (githubRes && !githubRes.error) {
          lines.push(`GitHub: ${githubRes.todayCount} commits today, ${githubRes.streak}-day streak, ${githubRes.total} total this year`);
        }
        try {
          const habits = JSON.parse(localStorage.getItem("hud-habits") ?? "[]");
          if (habits.length) lines.push(`Daily habits: ${habits.map((h: { name: string; done: boolean }) => `${h.name} (${h.done ? "done" : "pending"})`).join(", ")}`);
        } catch {}
        try {
          const calEvents: Record<string, { title: string; time?: string }[]> = JSON.parse(localStorage.getItem("hud-cal-events") ?? "{}");
          const d = new Date();
          const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const todayEvs = calEvents[todayKey] ?? [];
          if (todayEvs.length) lines.push(`Today's calendar events: ${todayEvs.map(e => `${e.title}${e.time ? ` at ${e.time}` : ""}`).join(", ")}`);
        } catch {}
        try {
          const pad = localStorage.getItem("hud-scratchpad") ?? "";
          if (pad.trim()) lines.push(`Scratchpad: ${pad.slice(0, 400)}`);
        } catch {}
        try {
          const moodLog: { mood: string; energy?: number; ts: number }[] = JSON.parse(localStorage.getItem("hud-mood-log") ?? "[]");
          if (moodLog.length > 0) {
            const latest = moodLog[moodLog.length - 1];
            const when = new Date(latest.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
            lines.push(`Current mood: ${latest.mood}${latest.energy ? ` (energy ${latest.energy}/5)` : ""} — logged ${when}`);
          }
        } catch {}
        return lines.join("\n");
      } catch { return undefined; }
    })();

    try {
      const res = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? "Request failed");
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "text") {
              accumulated += evt.text;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: accumulated, streaming: true };
                return next;
              });
            } else if (evt.type === "done") {
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: accumulated, streaming: false };
                return next;
              });
              speak(accumulated);
            } else if (evt.type === "tool_start") {
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = { ...last, toolCalls: [...(last.toolCalls ?? []), { name: evt.name, label: evt.label }] };
                return next;
              });
            } else if (evt.type === "tool_done") {
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = {
                  ...last,
                  toolCalls: (last.toolCalls ?? []).map(tc =>
                    tc.name === evt.name && !tc.result ? { ...tc, result: evt.result } : tc
                  ),
                };
                return next;
              });
            } else if (evt.type === "action") {
              window.dispatchEvent(new CustomEvent(`aria:${evt.name}`, { detail: evt.data }));
            } else if (evt.type === "error") {
              throw new Error(evt.message);
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: `[ERROR] ${msg}`, streaming: false };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, speak]);

  const abort = () => abortRef.current?.abort();

  const quickPrompts = [
    "Morning briefing",
    "What's playing on Spotify?",
    "Summarize my GitHub activity",
    "When is the next prayer?",
  ];

  // ── Closed ────────────────────────────────────────────────────────────────────

  if (mode === "closed") {
    return (
      <>
        <style>{NEXUS_CSS}</style>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openAs("fullscreen")}
            className="flex items-center gap-2.5 transition-all"
            style={{ border: "0.5px solid var(--ac-20)", background: "var(--ac-04)", padding: "5px 10px" }}
            title="Open ARIA"
          >
            <NexusCore size={18} active={false} />
            <span className="text-[9px] font-mono tracking-[0.22em] uppercase" style={{ color: "var(--ac-45)" }}>ARIA</span>
          </button>
          <button
            onClick={() => openAs("copilot")}
            className="p-1 transition-all"
            style={{ border: "0.5px solid var(--ac-10)", color: "var(--ac-30)" }}
            title="Open ARIA as co-pilot"
          >
            <PanelRight size={12} />
          </button>
        </div>
      </>
    );
  }

  // ── Co-pilot ──────────────────────────────────────────────────────────────────

  if (mode === "copilot") {
    return (
      <>
        <style>{NEXUS_CSS}</style>
        <div
          className="fixed top-0 right-0 bottom-0 z-[65] flex flex-col"
          style={{ width: 420, background: "#07111a", borderLeft: "0.5px solid var(--ac-08)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "0.5px solid var(--ac-07)" }}>
            <NexusCore size={26} active={streaming} />
            <span className="text-sm font-mono tracking-[0.25em] uppercase" style={{ color: "var(--ac-solid)" }}>ARIA</span>
            <span className="font-mono text-sm ml-0.5" style={{ color: streaming ? "var(--ac-solid)" : "var(--ac-30)" }}>
              {streaming ? "●" : "○"}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => { setVoiceEnabled(v => !v); window.speechSynthesis?.cancel(); }}
              className="transition-colors p-1"
              style={{ color: voiceEnabled ? "var(--ac-solid)" : "var(--ac-25)" }}
              title={voiceEnabled ? "Mute" : "Enable voice"}
            >
              {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button onClick={() => setMode("fullscreen")} className="p-1 transition-colors" style={{ color: "var(--ac-25)" }} title="Expand">
              <Maximize2 size={15} />
            </button>
            <button onClick={() => setMode("closed")} className="p-1 transition-colors" style={{ color: "var(--ac-25)" }}>
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 px-5 py-5"
            style={{ scrollbarWidth: "thin", scrollbarColor: "var(--ac-07) transparent" }}
          >
            {booting ? (
              <div className="flex flex-col items-center gap-4 mt-8">
                <NexusCore size={72} active={true} />
                <span className="text-xs font-mono tracking-[0.3em] animate-pulse" style={{ color: "var(--ac-30)" }}>INITIALIZING…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col gap-2">
                <div className="text-[9px] font-mono tracking-[0.22em] mb-1" style={{ color: "var(--ac-20)" }}>QUICK ACTIONS</div>
                {quickPrompts.map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-left px-3 py-2.5 text-[13px] font-mono tracking-wide transition-all"
                    style={{ border: "0.5px solid var(--ac-10)", color: "var(--ac-45)", background: "transparent" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => <NexusCopilotMessage key={i} msg={m} />)
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center px-5 py-2 shrink-0" style={{ borderTop: "0.5px solid var(--ac-07)" }}>
            <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ac-20)" }}>
              qwen2.5:7b · {messages.filter(m => m.role === "user").length} msgs
            </span>
            <div className="flex-1" />
            <button onClick={() => setMessages([])} className="text-[10px] font-mono tracking-widest uppercase transition-colors" style={{ color: "var(--ac-20)" }}>
              CLEAR
            </button>
          </div>

          {/* Input */}
          <div className="px-5 pb-5 shrink-0">
            <NexusInput
              inputRef={inputRef} input={input} setInput={setInput}
              streaming={streaming} booting={booting} listening={listening}
              toggleListening={toggleListening} send={send} abort={abort}
              compact
            />
          </div>
        </div>
      </>
    );
  }

  // ── Fullscreen ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{NEXUS_CSS}</style>
      <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden" style={{ background: "#07111a" }}>

        {/* Header */}
        <div className="flex items-center gap-4 px-8 py-4 shrink-0" style={{ borderBottom: "0.5px solid var(--ac-10)" }}>
          <div className="flex items-center gap-3">
            <NexusCore size={32} active={streaming || booting} />
            <span className="text-base font-mono tracking-[0.28em] uppercase" style={{ color: "var(--ac-solid)" }}>ARIA</span>
          </div>
          <span className="text-sm font-mono tracking-[0.15em]" style={{ color: streaming ? "var(--ac-solid)" : "var(--ac-30)" }}>
            {booting ? "INITIALIZING…" : streaming ? "PROCESSING…" : "READY"}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div
              className="text-[10px] font-mono tracking-[0.15em] px-4 py-1.5"
              style={{ border: "0.5px solid var(--ac-40)", color: "var(--ac-solid)", background: "var(--ac-10)" }}
            >
              FULLSCREEN
            </div>
            <button
              onClick={() => setMode("copilot")}
              className="flex items-center gap-2 text-[10px] font-mono tracking-[0.15em] px-4 py-1.5 transition-all"
              style={{ border: "0.5px solid var(--ac-20)", color: "var(--ac-40)", background: "transparent" }}
              title="Minimize to co-pilot"
            >
              <PanelRight size={12} /> CO-PILOT
            </button>
          </div>
          <button
            onClick={() => { setVoiceEnabled(v => !v); window.speechSynthesis?.cancel(); }}
            className="p-2 transition-colors"
            style={{ color: voiceEnabled ? "var(--ac-solid)" : "var(--ac-25)" }}
          >
            {voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button onClick={() => setMode("closed")} className="p-2 transition-colors" style={{ color: "var(--ac-25)" }}>
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Message feed */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-10 py-8 min-h-0 flex flex-col gap-7"
              style={{ scrollbarWidth: "thin", scrollbarColor: "var(--ac-07) transparent" }}
            >
              {booting ? (
                <div className="flex flex-col items-center gap-6 mt-16">
                  <NexusCore size={160} active={true} />
                  <span className="text-sm font-mono tracking-[0.4em] animate-pulse" style={{ color: "var(--ac-30)" }}>
                    ARIA INITIALIZING
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center gap-8 mt-10">
                  <NexusCore size={192} active={false} />
                  <div className="text-sm font-mono tracking-[0.3em] uppercase" style={{ color: "var(--ac-25)" }}>
                    Ask ARIA anything
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-w-md w-full">
                    {quickPrompts.map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="text-left px-4 py-3 text-sm font-mono tracking-wide transition-all"
                        style={{ border: "0.5px solid var(--ac-10)", color: "var(--ac-45)", background: "transparent" }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => <NexusMessage key={i} msg={m} index={i} />)
              )}
            </div>
          </div>

          {/* Tools panel */}
          <NexusToolsPanel messages={messages} />
        </div>

        {/* Input row */}
        <div className="px-10 py-6 shrink-0" style={{ borderTop: "0.5px solid var(--ac-07)" }}>
          <div className="max-w-4xl">
            <NexusInput
              inputRef={inputRef} input={input} setInput={setInput}
              streaming={streaming} booting={booting} listening={listening}
              toggleListening={toggleListening} send={send} abort={abort}
            />
            <div className="flex justify-between mt-3">
              <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ac-20)" }}>
                Enter to send · Shift+Enter for new line · Esc to close
              </span>
              <button onClick={() => setMessages([])} className="text-[10px] font-mono tracking-widest uppercase transition-colors" style={{ color: "var(--ac-20)" }}>
                CLEAR SESSION
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
