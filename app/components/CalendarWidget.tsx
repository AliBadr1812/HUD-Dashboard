"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ArrowUpRight, Plus, X, Cloud } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";
import type { CalDavEvent } from "../api/caldav/route";
import { useHudShortcut } from "../hooks/useHudShortcut";

const DAYS   = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type CalEvent  = { id: string; title: string; time: string };
type EventStore = Record<string, CalEvent[]>;

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function loadEvents(): EventStore {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("hud-cal-events") ?? "{}"); }
  catch { return {}; }
}

function saveEvents(events: EventStore) {
  localStorage.setItem("hud-cal-events", JSON.stringify(events));
}

function loadAppleCreds(): { appleId: string; appPassword: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("hud-apple-cal");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

async function fetchICloudEvents(): Promise<CalDavEvent[]> {
  const creds = loadAppleCreds();
  if (!creds) return [];

  // Check cache (refresh every 30 minutes)
  try {
    const cached = localStorage.getItem("hud-apple-cal-cache");
    if (cached) {
      const { ts, events } = JSON.parse(cached);
      if (Date.now() - ts < 30 * 60 * 1000) return events;
    }
  } catch {}

  try {
    const res = await fetch("/api/caldav", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    if (!res.ok) return [];
    const { events } = await res.json();
    localStorage.setItem("hud-apple-cal-cache", JSON.stringify({ ts: Date.now(), events }));
    return events ?? [];
  } catch { return []; }
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────

function MiniCalendar({
  viewDate, setViewDate, selectedDay, setSelectedDay, events, icloudEvents, today,
}: {
  viewDate: Date; setViewDate: (d: Date) => void;
  selectedDay: number | null; setSelectedDay: (d: number) => void;
  events: EventStore; icloudEvents: CalDavEvent[]; today: Date;
}) {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const icloudDays = new Set(
    icloudEvents
      .filter(e => e.dateKey.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
      .map(e => parseInt(e.dateKey.slice(8), 10))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-accent-400/50 hover:text-accent-300 transition-colors p-0.5"><ChevronLeft size={13} /></button>
        <span className="text-[10px] text-accent-400/80 tracking-widest uppercase">{MONTHS[month]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-accent-400/50 hover:text-accent-300 transition-colors p-0.5"><ChevronRight size={13} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => <div key={i} className="text-center text-[9px] text-accent-400/35 tracking-widest py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          const isToday    = isCurrentMonth && day === today.getDate();
          const isSelected = day === selectedDay;
          const hasLocal   = day ? (events[dateKey(year, month, day)]?.length ?? 0) > 0 : false;
          const hasCloud   = day ? icloudDays.has(day) : false;
          return (
            <div
              key={i}
              onClick={() => day && setSelectedDay(day)}
              className={`relative text-center py-1 text-[11px] leading-none transition-colors ${
                !day ? "" :
                isSelected ? "bg-accent-400/25 text-accent-200 font-bold border border-accent-400/50 cursor-pointer" :
                isToday    ? "bg-accent-400/10 text-accent-300 font-bold border border-accent-400/30 cursor-pointer" :
                             "text-white/55 hover:text-accent-300 hover:bg-accent-500/10 cursor-pointer"
              }`}
            >
              {day ?? ""}
              {(hasLocal || hasCloud) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 justify-center">
                  {hasLocal && <span className="w-1 h-1 rounded-full bg-accent-400/60" />}
                  {hasCloud && <span className="w-1 h-1 rounded-full bg-accent-300/40" />}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendar modal ────────────────────────────────────────────────────────────

function CalendarModal({ today }: { today: Date }) {
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents]       = useState<EventStore>(() => loadEvents());
  const [icloud, setICloud]       = useState<CalDavEvent[]>([]);
  const [newTitle, setNewTitle]   = useState("");
  const [newTime, setNewTime]     = useState("");
  const hasApple = !!loadAppleCreds();

  useEffect(() => {
    if (hasApple) fetchICloudEvents().then(setICloud);
  }, [hasApple]);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const key   = selectedDay ? dateKey(year, month, selectedDay) : null;
  const dayLocal   = key ? (events[key] ?? []) : [];
  const dayICloud  = selectedDay
    ? icloud.filter(e => e.dateKey === dateKey(year, month, selectedDay!))
    : [];
  const selectedLabel = selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : null;
  const totalEvents = dayLocal.length + dayICloud.length;

  const addEvent = () => {
    if (!newTitle.trim() || !key) return;
    const updated = { ...events, [key]: [...(events[key] ?? []), { id: Date.now().toString(), title: newTitle.trim(), time: newTime }] };
    setEvents(updated);
    saveEvents(updated);
    setNewTitle(""); setNewTime("");
  };

  const removeEvent = (evId: string) => {
    if (!key) return;
    const updated = { ...events, [key]: (events[key] ?? []).filter(e => e.id !== evId) };
    setEvents(updated);
    saveEvents(updated);
  };

  return (
    <div className="grid grid-cols-[1fr_190px] gap-4" style={{ minHeight: "360px" }}>
      <MiniCalendar
        viewDate={viewDate} setViewDate={setViewDate}
        selectedDay={selectedDay} setSelectedDay={setSelectedDay}
        events={events} icloudEvents={icloud} today={today}
      />

      <div className="border-l border-accent-500/10 pl-4 flex flex-col gap-2">
        <div className="text-[8px] text-accent-400/30 tracking-[0.2em] uppercase mb-1">
          {selectedLabel ?? "Select a day"}
        </div>

        {totalEvents === 0 && (
          <div className="text-[8px] text-accent-400/15 tracking-widest uppercase py-2">No events</div>
        )}

        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {/* iCloud events (read-only) */}
          {dayICloud.map(ev => (
            <div key={ev.id} className="flex items-start gap-1.5">
              <div className="flex-1 min-w-0">
                {ev.time && <div className="text-[7px] text-accent-400/30 font-mono mb-0.5">{ev.time}</div>}
                <div className="text-[9px] text-white/60 leading-snug">{ev.title}</div>
              </div>
              <Cloud size={8} className="text-accent-400/25 shrink-0 mt-1" />
            </div>
          ))}
          {/* Local events (editable) */}
          {dayLocal.map(ev => (
            <div key={ev.id} className="flex items-start gap-1.5 group">
              <div className="flex-1 min-w-0">
                {ev.time && <div className="text-[7px] text-accent-400/30 font-mono mb-0.5">{ev.time}</div>}
                <div className="text-[9px] text-white/70 leading-snug">{ev.title}</div>
              </div>
              <button onClick={() => removeEvent(ev.id)} className="text-accent-400/0 group-hover:text-red-400/50 hover:!text-red-400 transition-colors shrink-0 mt-0.5">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        {selectedDay && (
          <div className="border-t border-accent-500/10 pt-2 space-y-1.5">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              placeholder="Add event..."
              className="w-full bg-transparent border border-accent-500/15 text-[9px] text-white/70 px-2 py-1 focus:outline-none focus:border-accent-400/40 placeholder:text-accent-400/15"
            />
            <div className="flex gap-1">
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="flex-1 bg-transparent border border-accent-500/15 text-[8px] text-accent-400/50 px-2 py-1 focus:outline-none focus:border-accent-400/40"
              />
              <button
                onClick={addEvent}
                disabled={!newTitle.trim()}
                className="px-2 py-1 bg-accent-500/15 hover:bg-accent-500/25 text-accent-300 transition-colors disabled:opacity-30"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function CalendarWidget() {
  const today   = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents]     = useState<EventStore>(() => loadEvents());
  const [icloud, setICloud]     = useState<CalDavEvent[]>([]);
  const [expandOpen, setExpandOpen] = useState(false);
  useHudShortcut("hud:open-calendar", () => setExpandOpen(true));

  useEffect(() => {
    if (loadAppleCreds()) fetchICloudEvents().then(setICloud);
  }, []);

  // ARIA tool: add a calendar event via CustomEvent
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, date, time } = (e as CustomEvent).detail ?? {};
      if (!title || !date) return;
      // date from ARIA is already YYYY-MM-DD, which matches dateKey format
      const newEvent: CalEvent = { id: String(Date.now()), title, time: time ?? "" };
      setEvents(prev => {
        const next = { ...prev, [date]: [...(prev[date] ?? []), newEvent] };
        saveEvents(next);
        return next;
      });
    };
    window.addEventListener("aria:calendar_add_event", handler);
    return () => window.removeEventListener("aria:calendar_add_event", handler);
  }, []);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const monthLabel     = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const icloudDays = new Set(
    icloud
      .filter(e => e.dateKey.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
      .map(e => parseInt(e.dateKey.slice(8), 10))
  );

  const actions = (
    <button onClick={() => setExpandOpen(true)} className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5">
      <ArrowUpRight size={11} />
    </button>
  );

  return (
    <>
      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="CALENDAR — EVENTS" width="500px">
        <CalendarModal today={today} />
      </HudModal>
      <HudPanel title="CALENDAR" icon={<CalendarDays size={10} />} actions={actions}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-accent-400/50 hover:text-accent-300 transition-colors p-0.5"><ChevronLeft size={13} /></button>
            <span className="text-[10px] text-accent-400/80 tracking-widest uppercase">{monthLabel}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-accent-400/50 hover:text-accent-300 transition-colors p-0.5"><ChevronRight size={13} /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d, i) => <div key={i} className="text-center text-[9px] text-accent-400/35 tracking-widest py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              const isToday  = isCurrentMonth && day === today.getDate();
              const hasLocal = day ? (events[dateKey(year, month, day)]?.length ?? 0) > 0 : false;
              const hasCloud = day ? icloudDays.has(day) : false;
              return (
                <div key={i} className={`relative text-center py-1 text-[11px] leading-none ${
                  !day ? "" :
                  isToday ? "bg-accent-400/20 text-accent-300 font-bold border border-accent-400/40" :
                             "text-white/55 hover:text-accent-300 hover:bg-accent-500/10 cursor-pointer transition-colors"
                }`}>
                  {day ?? ""}
                  {(hasLocal || hasCloud) && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 justify-center">
                      {hasLocal && <span className="w-1 h-1 rounded-full bg-accent-400/60" />}
                      {hasCloud && <span className="w-1 h-1 rounded-full bg-accent-300/40" />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </HudPanel>
    </>
  );
}
