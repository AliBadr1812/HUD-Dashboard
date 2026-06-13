"use client";

import { useState } from "react";
import { Settings, Eye } from "lucide-react";
import HudModal from "./HudModal";

// ── Settings (Option B) ──────────────────────────────────────────────────────

type Section = "look" | "data" | "apis" | "about";

const NAV: { id: Section; label: string }[] = [
  { id: "look",  label: "Look"  },
  { id: "data",  label: "Data"  },
  { id: "apis",  label: "APIs"  },
  { id: "about", label: "About" },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-7 h-3.5 rounded-full border flex items-center shrink-0 transition-colors ${
        on ? "bg-cyan-400/20 border-cyan-400/50" : "bg-transparent border-cyan-500/25"
      }`}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full transition-all ${
          on ? "bg-cyan-400/80 translate-x-3.5" : "bg-cyan-400/20 translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cyan-500/10 last:border-0">
      <span className="text-[9px] text-cyan-400/45 tracking-[0.2em] uppercase">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[7px] text-cyan-400/20 tracking-[0.3em] uppercase mt-4 mb-1 first:mt-0">
      {children}
    </div>
  );
}

function HudSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-cyan-500/5 border border-cyan-500/20 text-cyan-400/60 text-[8px] tracking-[0.12em] uppercase py-1 px-2 font-mono focus:outline-none"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ApiRow({ name, ok, href }: { name: string; ok: boolean; href?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cyan-500/10 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-cyan-400" : "bg-red-400/60"}`} />
        <span className="text-[9px] text-cyan-400/45 tracking-[0.2em] uppercase">{name}</span>
      </div>
      {ok ? (
        <span className="text-[8px] text-cyan-400/30 tracking-widest">CONNECTED</span>
      ) : href ? (
        <a
          href={href}
          target="_blank"
          className="text-[8px] text-cyan-400/50 hover:text-cyan-300 tracking-widest underline transition-colors"
        >
          CONNECT
        </a>
      ) : (
        <span className="text-[8px] text-red-400/40 tracking-widest">ERROR</span>
      )}
    </div>
  );
}

function SettingsContent() {
  const [section, setSection] = useState<Section>("look");
  const [scanline, setScanline] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [showSeconds, setShowSeconds] = useState(true);
  const [clockFormat, setClockFormat] = useState("24h");
  const [accentColor, setAccentColor] = useState("Cyan");
  const [city, setCity] = useState("Amsterdam");
  const [newsSource, setNewsSource] = useState("Al Jazeera");
  const [hijri, setHijri] = useState(true);
  const [transportRefresh, setTransportRefresh] = useState("30s");

  return (
    <div className="-m-4 flex min-h-[320px]">
      {/* Sidebar */}
      <div className="w-[90px] border-r border-cyan-500/15 py-3 shrink-0">
        {NAV.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`w-full text-left px-3 py-2.5 text-[8px] tracking-[0.2em] uppercase transition-colors ${
              section === id
                ? "text-cyan-400/80 bg-cyan-500/5 border-l-2 border-cyan-400/50 pl-[10px]"
                : "text-cyan-400/25 hover:text-cyan-400/50 border-l-2 border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[400px]">
        {section === "look" && (
          <>
            <SecLabel>Display</SecLabel>
            <Row label="Scanline effect"><Toggle on={scanline} onToggle={() => setScanline(!scanline)} /></Row>
            <Row label="Animations"><Toggle on={animations} onToggle={() => setAnimations(!animations)} /></Row>
            <Row label="Accent color">
              <HudSelect value={accentColor} onChange={setAccentColor} options={["Cyan", "Green", "Amber"]} />
            </Row>
            <SecLabel>Clock</SecLabel>
            <Row label="Format">
              <HudSelect value={clockFormat} onChange={setClockFormat} options={["24h", "12h"]} />
            </Row>
            <Row label="Show seconds"><Toggle on={showSeconds} onToggle={() => setShowSeconds(!showSeconds)} /></Row>
          </>
        )}

        {section === "data" && (
          <>
            <SecLabel>Location</SecLabel>
            <Row label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-cyan-500/5 border border-cyan-500/20 text-cyan-400/60 text-[8px] tracking-wider uppercase py-1 px-2 font-mono w-28 focus:outline-none focus:border-cyan-400/40"
              />
            </Row>
            <SecLabel>News</SecLabel>
            <Row label="Source">
              <HudSelect value={newsSource} onChange={setNewsSource} options={["Al Jazeera", "BBC", "Reuters"]} />
            </Row>
            <SecLabel>Calendar</SecLabel>
            <Row label="Show Hijri date"><Toggle on={hijri} onToggle={() => setHijri(!hijri)} /></Row>
            <SecLabel>Transport</SecLabel>
            <Row label="Refresh interval">
              <HudSelect value={transportRefresh} onChange={setTransportRefresh} options={["15s", "30s", "1m", "5m"]} />
            </Row>
          </>
        )}

        {section === "apis" && (
          <>
            <SecLabel>Integrations</SecLabel>
            <ApiRow name="Spotify" ok={true} />
            <ApiRow name="GitHub" ok={true} />
            <ApiRow name="OpenWeather" ok={true} />
            <ApiRow name="OVapi (GVB)" ok={true} />
          </>
        )}

        {section === "about" && (
          <>
            <SecLabel>System</SecLabel>
            <Row label="Version"><span className="text-[8px] text-cyan-400/30 tracking-widest">v1.0.0</span></Row>
            <Row label="Framework"><span className="text-[8px] text-cyan-400/30 tracking-widest">Next.js 16</span></Row>
            <Row label="Styles"><span className="text-[8px] text-cyan-400/30 tracking-widest">Tailwind 4</span></Row>
            <SecLabel>Location</SecLabel>
            <Row label="City"><span className="text-[8px] text-cyan-400/30 tracking-widest">Amsterdam, NL</span></Row>
            <Row label="Timezone"><span className="text-[8px] text-cyan-400/30 tracking-widest">Europe / Amsterdam</span></Row>
          </>
        )}
      </div>
    </div>
  );
}

// ── Module Control (Option C) ────────────────────────────────────────────────

const WIDGETS = [
  { id: "clock",     name: "Clock",     status: "live" },
  { id: "weather",   name: "Weather",   status: "live" },
  { id: "spotify",   name: "Spotify",   status: "live" },
  { id: "news",      name: "News",      status: "live" },
  { id: "github",    name: "GitHub",    status: "live" },
  { id: "transport", name: "Transport", status: "live" },
  { id: "missions",  name: "Missions",  status: "mock" },
  { id: "calendar",  name: "Calendar",  status: "live" },
  { id: "finance",   name: "Finance",   status: "mock" },
  { id: "prayer",    name: "Prayer",    status: "live" },
  { id: "system",    name: "System",    status: "live" },
] as const;

function ModuleControlContent() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(WIDGETS.map((w) => [w.id, true]))
  );

  const toggle = (id: string) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="grid grid-cols-2 gap-2">
      {WIDGETS.map((w) => {
        const on = enabled[w.id];
        return (
          <div
            key={w.id}
            className={`border p-2.5 transition-colors ${
              on
                ? "border-cyan-500/25 bg-cyan-500/5"
                : "border-cyan-500/10 bg-transparent opacity-50"
            }`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <span className={`text-[9px] tracking-[0.2em] uppercase ${on ? "text-cyan-400/60" : "text-cyan-400/25"}`}>
                {w.name}
              </span>
              <Toggle on={on} onToggle={() => toggle(w.id)} />
            </div>
            <div className="flex items-center gap-1.5">
              {on ? (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${w.status === "live" ? "bg-cyan-400/70" : "bg-amber-400/60"}`} />
                  <span className="text-[7px] text-cyan-400/25 tracking-widest uppercase">
                    {w.status === "live" ? "Live" : "Mock"}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
                  <span className="text-[7px] text-cyan-400/20 tracking-widest uppercase">Hidden</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Header component ─────────────────────────────────────────────────────────

export default function HeaderSettings() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

  return (
    <>
      <HudModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="System Configuration"
        width="460px"
      >
        <SettingsContent />
      </HudModal>

      <HudModal
        isOpen={modulesOpen}
        onClose={() => setModulesOpen(false)}
        title="Module Control"
        width="380px"
      >
        <ModuleControlContent />
      </HudModal>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setModulesOpen(true)}
          className="text-cyan-400/30 hover:text-cyan-300 transition-colors p-0.5"
          aria-label="Module control"
        >
          <Eye size={13} />
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-cyan-400/30 hover:text-cyan-300 transition-colors p-0.5"
          aria-label="Settings"
        >
          <Settings size={13} />
        </button>
      </div>
    </>
  );
}
