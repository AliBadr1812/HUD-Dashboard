"use client";

import { useState, useEffect } from "react";
import { Settings, Eye } from "lucide-react";
import HudModal from "./HudModal";
import { useSettings, AccentColor, ClockFormat, DEFAULT_MODULES } from "../context/SettingsContext";
import { useHudShortcut } from "../hooks/useHudShortcut";

// ── Generic UI atoms ──────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-7 h-3.5 rounded-full border flex items-center shrink-0 transition-colors ${
        on ? "bg-accent-400/20 border-accent-400/50" : "bg-transparent border-accent-500/25"
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full transition-all ${on ? "bg-accent-400/80 translate-x-3.5" : "bg-accent-400/20 translate-x-0.5"}`} />
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-accent-500/10 last:border-0">
      <span className="text-[9px] text-accent-400/45 tracking-[0.2em] uppercase">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[7px] text-accent-400/20 tracking-[0.3em] uppercase mt-4 mb-1 first:mt-0">{children}</div>;
}

function HudSelect<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className="bg-accent-500/5 border border-accent-500/20 text-accent-400/60 text-[8px] tracking-[0.12em] uppercase py-1 px-2 font-mono focus:outline-none"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── Settings content ──────────────────────────────────────────────────────────

type Section = "look" | "data" | "apis" | "about";
const NAV: { id: Section; label: string }[] = [
  { id: "look",  label: "Look"  },
  { id: "data",  label: "Data"  },
  { id: "apis",  label: "APIs"  },
  { id: "about", label: "About" },
];

type AppleCal = { appleId: string; appPassword: string } | null;

function SettingsContent() {
  const { settings, update } = useSettings();
  const [section, setSection] = useState<Section>("look");

  // Apple Calendar credentials (stored separately, sensitive)
  const [appleCal, setAppleCal] = useState<AppleCal>(null);
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [appleStatus, setAppleStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hud-apple-cal");
      if (stored) {
        const creds = JSON.parse(stored) as AppleCal;
        setAppleCal(creds);
        if (creds) { setAppleId(creds.appleId); setAppPassword(creds.appPassword); }
      }
    } catch {}
  }, []);

  const saveAppleCal = async () => {
    if (!appleId.trim() || !appPassword.trim()) return;
    setAppleStatus("testing");
    try {
      const res = await fetch("/api/caldav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId: appleId.trim(), appPassword: appPassword.trim(), probe: true }),
      });
      if (res.ok) {
        const creds = { appleId: appleId.trim(), appPassword: appPassword.trim() };
        localStorage.setItem("hud-apple-cal", JSON.stringify(creds));
        setAppleCal(creds);
        setAppleStatus("ok");
      } else {
        setAppleStatus("error");
      }
    } catch {
      setAppleStatus("error");
    }
  };

  const disconnectApple = () => {
    localStorage.removeItem("hud-apple-cal");
    localStorage.removeItem("hud-apple-cal-cache");
    setAppleCal(null);
    setAppleId(""); setAppPassword("");
    setAppleStatus("idle");
  };

  const inp = "bg-accent-500/5 border border-accent-500/20 text-accent-400/60 text-[8px] tracking-wider py-1 px-2 font-mono w-full focus:outline-none focus:border-accent-400/40";

  return (
    <div className="-m-4 flex min-h-[320px]">
      {/* Sidebar */}
      <div className="w-[90px] border-r border-accent-500/15 py-3 shrink-0">
        {NAV.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`w-full text-left px-3 py-2.5 text-[8px] tracking-[0.2em] uppercase transition-colors ${
              section === id
                ? "text-accent-400/80 bg-accent-500/5 border-l-2 border-accent-400/50 pl-[10px]"
                : "text-accent-400/25 hover:text-accent-400/50 border-l-2 border-transparent"
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
            <Row label="Scanline effect">
              <Toggle on={settings.scanline} onToggle={() => update({ scanline: !settings.scanline })} />
            </Row>
            <Row label="Animations">
              <Toggle on={settings.animations} onToggle={() => update({ animations: !settings.animations })} />
            </Row>
            <Row label="Accent color">
              <HudSelect<AccentColor>
                value={settings.accentColor}
                onChange={v => update({ accentColor: v })}
                options={["Cyan", "Green", "Amber"]}
              />
            </Row>
            <SecLabel>Clock</SecLabel>
            <Row label="Format">
              <HudSelect<ClockFormat>
                value={settings.clockFormat}
                onChange={v => update({ clockFormat: v })}
                options={["24h", "12h"]}
              />
            </Row>
            <Row label="Show seconds">
              <Toggle on={settings.showSeconds} onToggle={() => update({ showSeconds: !settings.showSeconds })} />
            </Row>
            <Row label="Hijri date">
              <Toggle on={settings.showHijri} onToggle={() => update({ showHijri: !settings.showHijri })} />
            </Row>
          </>
        )}

        {section === "data" && (
          <>
            <SecLabel>Display</SecLabel>
            <Row label="Hijri date">
              <Toggle on={settings.showHijri} onToggle={() => update({ showHijri: !settings.showHijri })} />
            </Row>
          </>
        )}

        {section === "apis" && (
          <>
            <SecLabel>Integrations</SecLabel>
            {[
              { name: "Spotify",       ok: true },
              { name: "GitHub",        ok: true },
              { name: "OpenWeather",   ok: true },
              { name: "OVapi (GVB)",   ok: true },
            ].map(({ name, ok }) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-accent-500/10">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-accent-400" : "bg-red-400/60"}`} />
                  <span className="text-[9px] text-accent-400/45 tracking-[0.2em] uppercase">{name}</span>
                </div>
                <span className="text-[8px] text-accent-400/30 tracking-widest">{ok ? "CONNECTED" : "ERROR"}</span>
              </div>
            ))}

            <SecLabel>Apple Calendar (CalDAV)</SecLabel>
            <div className="text-[8px] text-accent-400/25 tracking-wider mb-2 leading-relaxed">
              Use an app-specific password from{" "}
              <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener" className="text-accent-400/50 underline hover:text-accent-300">
                appleid.apple.com
              </a>
              , not your main password.
            </div>
            {appleCal ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
                    <span className="text-[9px] text-accent-400/60 tracking-widest">{appleCal.appleId}</span>
                  </div>
                  <button onClick={disconnectApple} className="text-[8px] text-red-400/50 hover:text-red-400 tracking-widest transition-colors">
                    DISCONNECT
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className="text-[7px] text-accent-400/20 tracking-widest uppercase mb-1">Apple ID</div>
                  <input
                    type="email"
                    value={appleId}
                    onChange={e => setAppleId(e.target.value)}
                    placeholder="you@icloud.com"
                    className={inp + " placeholder:text-accent-400/15"}
                  />
                </div>
                <div>
                  <div className="text-[7px] text-accent-400/20 tracking-widest uppercase mb-1">App-Specific Password</div>
                  <input
                    type="password"
                    value={appPassword}
                    onChange={e => setAppPassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className={inp + " placeholder:text-accent-400/15"}
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={saveAppleCal}
                    disabled={appleStatus === "testing" || !appleId || !appPassword}
                    className="px-3 py-1.5 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 text-[8px] tracking-widest uppercase transition-colors disabled:opacity-40"
                  >
                    {appleStatus === "testing" ? "TESTING..." : "CONNECT"}
                  </button>
                  {appleStatus === "error" && (
                    <span className="text-[8px] text-red-400/60 tracking-widest">AUTH FAILED</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {section === "about" && (
          <>
            <SecLabel>System</SecLabel>
            <Row label="Version"><span className="text-[8px] text-accent-400/30 tracking-widest">v1.0.0</span></Row>
            <Row label="Framework"><span className="text-[8px] text-accent-400/30 tracking-widest">Next.js 16</span></Row>
            <Row label="Styles"><span className="text-[8px] text-accent-400/30 tracking-widest">Tailwind 4</span></Row>
            <SecLabel>Location</SecLabel>
            <Row label="City"><span className="text-[8px] text-accent-400/30 tracking-widest">Amsterdam, NL</span></Row>
            <Row label="Timezone"><span className="text-[8px] text-accent-400/30 tracking-widest">Europe / Amsterdam</span></Row>
          </>
        )}
      </div>
    </div>
  );
}

// ── Module control ────────────────────────────────────────────────────────────

const WIDGETS = [
  { id: "clock",      name: "Clock",      status: "live"  },
  { id: "pomodoro",   name: "Pomodoro",   status: "local" },
  { id: "weather",    name: "Weather",    status: "live"  },
  { id: "spotify",    name: "Spotify",    status: "live"  },
  { id: "news",       name: "News",       status: "live"  },
  { id: "github",     name: "GitHub",     status: "live"  },
  { id: "transport",  name: "Transport",  status: "live"  },
  { id: "missions",   name: "Missions",   status: "local" },
  { id: "calendar",   name: "Calendar",   status: "local" },
  { id: "finance",    name: "Finance",    status: "local" },
  { id: "prayer",     name: "Prayer",     status: "live"  },
  { id: "system",     name: "System",     status: "live"  },
  { id: "scratchpad", name: "Scratchpad", status: "local" },
  { id: "mood",       name: "Mood Log",   status: "local" },
] as const;

function ModuleControlContent() {
  const { settings, setModule } = useSettings();

  return (
    <div className="grid grid-cols-2 gap-2">
      {WIDGETS.map(w => {
        const on = settings.modules[w.id] ?? true;
        return (
          <div
            key={w.id}
            className={`border p-2.5 transition-colors ${on ? "border-accent-500/25 bg-accent-500/5" : "border-accent-500/10 bg-transparent opacity-50"}`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <span className={`text-[9px] tracking-[0.2em] uppercase ${on ? "text-accent-400/60" : "text-accent-400/25"}`}>
                {w.name}
              </span>
              <Toggle on={on} onToggle={() => setModule(w.id, !on)} />
            </div>
            <div className="flex items-center gap-1.5">
              {on ? (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${w.status === "live" ? "bg-accent-400/70" : "bg-amber-400/60"}`} />
                  <span className="text-[7px] text-accent-400/25 tracking-widest uppercase">
                    {w.status === "live" ? "Live" : "Local"}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
                  <span className="text-[7px] text-accent-400/20 tracking-widest uppercase">Hidden</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Header component ──────────────────────────────────────────────────────────

export default function HeaderSettings() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modulesOpen, setModulesOpen]   = useState(false);
  useHudShortcut("hud:open-settings", () => setSettingsOpen(true));
  useHudShortcut("hud:open-modules",  () => setModulesOpen(true));

  return (
    <>
      <HudModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="System Configuration" width="460px">
        <SettingsContent />
      </HudModal>
      <HudModal isOpen={modulesOpen} onClose={() => setModulesOpen(false)} title="Module Control" width="380px">
        <ModuleControlContent />
      </HudModal>
      <div className="flex items-center gap-1.5">
        <button onClick={() => setModulesOpen(true)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5" aria-label="Module control">
          <Eye size={13} />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5" aria-label="Settings">
          <Settings size={13} />
        </button>
      </div>
    </>
  );
}
