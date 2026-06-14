"use client";

import { useEffect, useState } from "react";
import { Cpu, ArrowUpRight, ArrowUp, ArrowDown } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";

type SystemData = {
  cpu: number;
  ram: number;
  ramUsedGB: number;
  ramTotalGB: number;
  disk: number;
  diskUsedGB: number;
  diskTotalGB: number;
};

type DetailData = SystemData & {
  cpuModel: string;
  cpuCores: number;
  cpuPhysical: number;
  cpuSpeed: number;
  cpuTemp: number | null;
  cpuPerCore: number[];
  ramAvailGB: number;
  swapUsedGB: number;
  swapTotalGB: number;
  netUp: number;
  netDown: number;
  netIface: string | null;
  osName: string;
  osVersion: string;
  hostname: string;
  arch: string;
  uptime: number;
  battery: { percent: number; charging: boolean; timeRemaining: number | null } | null;
  processes: number | null;
  processesRunning: number | null;
};

function arcColor(pct: number): string {
  if (pct > 85) return "#f87171";
  if (pct > 65) return "#fbbf24";
  return "var(--ac-solid)";
}

function ArcGauge({
  label, pct, sub, sub2,
}: { label: string; pct: number; sub: string; sub2?: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circ * (1 - clamped / 100);
  const color = arcColor(pct);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const angle = -90 + t * 360;
    const rad = (angle * Math.PI) / 180;
    const x1 = 44 + (r + 7) * Math.cos(rad);
    const y1 = 44 + (r + 7) * Math.sin(rad);
    const x2 = 44 + (r + 10) * Math.cos(rad);
    const y2 = 44 + (r + 10) * Math.sin(rad);
    return { x1, y1, x2, y2 };
  });

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[7px] tracking-[0.3em] uppercase" style={{ color: "var(--ac-30)" }}>
        {label}
      </div>
      <div className="relative">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r + 12} fill="none" style={{ stroke: "var(--ac-04)" }} strokeWidth="1" />
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} style={{ stroke: "var(--ac-20)" }} strokeWidth="1" />
          ))}
          <circle cx="44" cy="44" r={r} fill="none" style={{ stroke: "var(--ac-08)" }} strokeWidth="4" />
          <circle
            cx="44" cy="44" r={r}
            fill="none"
            style={{ stroke: color, opacity: 0.85, transition: "stroke-dashoffset 0.7s ease" }}
            strokeWidth="4"
            strokeLinecap="butt"
            strokeDasharray={`${circ}`}
            strokeDashoffset={`${offset}`}
            transform="rotate(-90 44 44)"
          />
          <circle cx="44" cy="44" r={r - 8} fill="none" style={{ stroke: "var(--ac-04)" }} strokeWidth="0.5" />
          <text x="44" y="41" textAnchor="middle" dominantBaseline="middle" style={{ fill: color }} fontSize="16" fontWeight="bold" fontFamily="monospace" opacity="0.9">
            {clamped}
          </text>
          <text x="44" y="54" textAnchor="middle" style={{ fill: "var(--ac-25)" }} fontSize="7" fontFamily="monospace">
            PCT
          </text>
        </svg>
      </div>
      <div className="text-[8px] font-mono text-center" style={{ color: "var(--ac-45)" }}>{sub}</div>
      {sub2 && <div className="text-[7px] font-mono text-center" style={{ color: "var(--ac-20)" }}>{sub2}</div>}
    </div>
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="w-1.5 h-1.5 bg-accent-400/40 rotate-45 shrink-0" />
      <span className="text-[7px] tracking-[0.35em] uppercase" style={{ color: "var(--ac-25)" }}>{children}</span>
      <div className="flex-1 border-t" style={{ borderColor: "var(--ac-08)" }} />
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[8px] tracking-[0.15em] uppercase" style={{ color: "var(--ac-25)" }}>{label}</span>
      <span className="text-[9px] font-mono" style={{ color: accent ? "var(--ac-solid)" : "var(--ac-60)" }}>
        {value}
      </span>
    </div>
  );
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ExpandedContent() {
  const [data, setData] = useState<DetailData | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/system?detail=1")
        .then((r) => r.json())
        .then((d) => { if (!d.error) setData(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[9px] tracking-[0.3em] uppercase animate-pulse" style={{ color: "var(--ac-20)" }}>
          INITIALIZING...
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-around pt-1 pb-2">
        <ArcGauge label="Processor" pct={data.cpu} sub={`${data.cpuPhysical}C / ${data.cpuCores}T`} sub2={data.cpuModel} />
        <ArcGauge label="Memory" pct={data.ram} sub={`${data.ramUsedGB} / ${data.ramTotalGB} GB`} sub2={`${data.ramAvailGB} GB free`} />
        <ArcGauge label="Storage" pct={data.disk} sub={`${data.diskUsedGB} / ${data.diskTotalGB} GB`} sub2={`${data.diskTotalGB - data.diskUsedGB} GB free`} />
      </div>

      {data.cpuPerCore.length > 0 && (
        <>
          <SectionDivider>Core load spectrum</SectionDivider>
          <div className="flex gap-1 items-end" style={{ height: "48px" }}>
            {data.cpuPerCore.map((pct, i) => {
              const h = Math.max(3, pct);
              const col = arcColor(pct);
              return (
                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-0.5" style={{ height: "48px" }}>
                  <div
                    className="w-full transition-all duration-700"
                    style={{ height: `${h}%`, background: col, opacity: 0.6 }}
                  />
                  <span style={{ fontSize: "6px", color: "var(--ac-20)", fontFamily: "monospace" }}>{i + 1}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-x-4 mt-1">
        <div>
          <SectionDivider>Network</SectionDivider>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1.5">
                <ArrowUp size={9} style={{ color: "var(--ac-40)" }} />
                <span className="text-[8px] tracking-widest uppercase" style={{ color: "var(--ac-25)" }}>Upload</span>
              </div>
              <span className="text-[10px] font-mono font-bold" style={{ color: "var(--ac-solid)", opacity: 0.7 }}>
                {data.netUp} <span className="text-[7px] opacity-50">KB/s</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1.5">
                <ArrowDown size={9} style={{ color: "var(--ac-40)" }} />
                <span className="text-[8px] tracking-widest uppercase" style={{ color: "var(--ac-25)" }}>Download</span>
              </div>
              <span className="text-[10px] font-mono font-bold" style={{ color: "var(--ac-solid)", opacity: 0.7 }}>
                {data.netDown} <span className="text-[7px] opacity-50">KB/s</span>
              </span>
            </div>
            {data.netIface && <InfoRow label="Interface" value={data.netIface} />}
          </div>

          {data.battery && (
            <>
              <SectionDivider>Battery</SectionDivider>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] tracking-widest uppercase" style={{ color: "var(--ac-25)" }}>
                    {data.battery.charging ? "Charging" : "Discharging"}
                  </span>
                  <span
                    className="text-[14px] font-mono font-bold"
                    style={{ color: data.battery.percent < 20 ? "#f87171" : "var(--ac-solid)", opacity: 0.8 }}
                  >
                    {data.battery.percent}%
                  </span>
                </div>
                <div className="h-1.5 w-full" style={{ background: "var(--ac-07)" }}>
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${data.battery.percent}%`,
                      background: data.battery.percent < 20 ? "#f87171" : "var(--ac-solid)",
                      opacity: 0.6,
                    }}
                  />
                </div>
                {data.battery.timeRemaining && (
                  <div className="text-[8px] font-mono" style={{ color: "var(--ac-30)" }}>
                    {data.battery.timeRemaining}m remaining
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div>
          <SectionDivider>System</SectionDivider>
          <div className="space-y-0">
            <InfoRow label="OS" value={`${data.osName} ${data.osVersion}`} />
            <InfoRow label="Arch" value={data.arch} />
            <InfoRow label="Host" value={data.hostname} />
            <InfoRow label="Uptime" value={formatUptime(data.uptime)} />
            <InfoRow label="Speed" value={data.cpuSpeed ? `${data.cpuSpeed} GHz` : "—"} />
            <InfoRow label="Temp" value={data.cpuTemp != null ? `${data.cpuTemp}°C` : "N/A"} />
            {data.swapTotalGB > 0 && (
              <InfoRow label="Swap" value={`${data.swapUsedGB} / ${data.swapTotalGB} GB`} />
            )}
            {data.processes != null && (
              <InfoRow label="Procs" value={`${data.processesRunning ?? "—"} / ${data.processes}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ pct, color = "bg-accent-400" }: { pct: number; color?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const barColor = clamped > 85 ? "bg-red-400" : clamped > 65 ? "bg-amber-400" : color;
  return (
    <div className="flex-1 h-1.5 bg-accent-500/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function Row({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-accent-400/50 tracking-[0.2em] uppercase">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-accent-400/30">{detail}</span>
          <span className="text-[10px] text-accent-300 font-bold w-8 text-right">{pct}%</span>
        </div>
      </div>
      <Bar pct={pct} />
    </div>
  );
}

export default function SystemMonitor() {
  const [data, setData] = useState<SystemData | null>(null);
  const [expandOpen, setExpandOpen] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/system")
        .then((r) => r.json())
        .then((d) => { if (!d.error) setData(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  const actions = (
    <button onClick={() => setExpandOpen(true)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5">
      <ArrowUpRight size={11} />
    </button>
  );

  return (
    <>
      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="SYSTEM MONITOR — DETAIL" width="480px">
        <ExpandedContent />
      </HudModal>
      <HudPanel title="SYSTEM MONITOR" icon={<Cpu size={10} />} actions={actions}>
        {data ? (
          <div className="space-y-3">
            <Row label="CPU" pct={data.cpu} detail="" />
            <Row label="RAM" pct={data.ram} detail={`${data.ramUsedGB} / ${data.ramTotalGB} GB`} />
            <Row label="DISK" pct={data.disk} detail={`${data.diskUsedGB} / ${data.diskTotalGB} GB`} />
          </div>
        ) : (
          <div className="space-y-3">
            {["CPU", "RAM", "DISK"].map((l) => (
              <div key={l} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[9px] text-accent-400/50 tracking-[0.2em] uppercase">{l}</span>
                  <span className="text-[9px] text-accent-400/20">—</span>
                </div>
                <div className="h-1.5 bg-accent-500/10 rounded-full" />
              </div>
            ))}
          </div>
        )}
      </HudPanel>
    </>
  );
}
