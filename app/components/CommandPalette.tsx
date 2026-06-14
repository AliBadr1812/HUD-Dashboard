"use client";

import { useEffect, useRef, useState } from "react";
import {
  Music, GitBranch, CalendarDays, Cloud, Newspaper,
  Wallet, Target, Settings, Eye, Command, Search, Zap,
} from "lucide-react";
import { hudOpen } from "../hooks/useHudShortcut";

type Cmd = {
  id:       string;
  label:    string;
  group:    string;
  key?:     string;   // single-key shortcut label
  icon:     React.ReactNode;
  action:   () => void;
};

const COMMANDS: Cmd[] = [
  { id: "spotify",      label: "Open Spotify Library",    group: "Widgets", key: "S", icon: <Music size={12} />,       action: () => hudOpen("hud:open-spotify")       },
  { id: "github",       label: "Open GitHub Overview",     group: "Widgets", key: "G", icon: <GitBranch size={12} />,   action: () => hudOpen("hud:open-github")        },
  { id: "github-work",  label: "Open GitHub Work Items",   group: "Widgets",           icon: <GitBranch size={12} />,   action: () => hudOpen("hud:open-github-work")   },
  { id: "calendar",     label: "Open Calendar",            group: "Widgets", key: "C", icon: <CalendarDays size={12} />,action: () => hudOpen("hud:open-calendar")      },
  { id: "weather",      label: "Open Weather Details",     group: "Widgets", key: "W", icon: <Cloud size={12} />,       action: () => hudOpen("hud:open-weather")       },
  { id: "news",         label: "Open News Feed",           group: "Widgets", key: "N", icon: <Newspaper size={12} />,   action: () => hudOpen("hud:open-news")          },
  { id: "finance",      label: "Open Finance Details",     group: "Widgets", key: "F", icon: <Wallet size={12} />,      action: () => hudOpen("hud:open-finance")       },
  { id: "habits",       label: "Manage Daily Missions",    group: "Widgets", key: "H", icon: <Target size={12} />,      action: () => hudOpen("hud:open-habits")        },
  { id: "aria",         label: "Open ARIA Assistant",      group: "System",  key: "A", icon: <Zap size={12} />,         action: () => hudOpen("hud:open-aria")          },
  { id: "settings",     label: "Open Settings",            group: "System",            icon: <Settings size={12} />,    action: () => hudOpen("hud:open-settings")      },
  { id: "modules",      label: "Module Control",           group: "System",            icon: <Eye size={12} />,         action: () => hudOpen("hud:open-modules")       },
];

const KEY_MAP: Record<string, string> = Object.fromEntries(
  COMMANDS.filter(c => c.key).map(c => [c.key!.toLowerCase(), c.id])
);

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement).isContentEditable;
}

export default function CommandPalette() {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [cursor, setCursor]     = useState(0);
  const inputRef                = useRef<HTMLInputElement>(null);
  const listRef                 = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase()) ||
        (c.key && c.key.toLowerCase() === query.toLowerCase())
      )
    : COMMANDS;

  // Reset cursor when filter changes
  useEffect(() => setCursor(0), [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[cursor] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // Global keydown handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K — toggle palette
      if (meta && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
        return;
      }

      // Escape — close palette
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      // Palette navigation when open
      if (open) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCursor(v => Math.min(v + 1, filtered.length - 1)); return; }
        if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(v => Math.max(v - 1, 0)); return; }
        if (e.key === "Enter" && filtered[cursor]) {
          e.preventDefault();
          filtered[cursor].action();
          setOpen(false);
          return;
        }
        return;
      }

      // Single-key shortcuts — only when not typing in any input
      if (!meta && !e.shiftKey && !e.altKey && !isInputFocused()) {
        const cmdId = KEY_MAP[e.key.toLowerCase()];
        if (cmdId) {
          const cmd = COMMANDS.find(c => c.id === cmdId);
          cmd?.action();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, cursor]);

  if (!open) return null;

  const groups = [...new Set(filtered.map(c => c.group))];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[18vh]"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Panel */}
      <div className="relative w-full max-w-md mx-4">
        {/* Corner brackets */}
        <span className="absolute -top-px -left-px w-3.5 h-3.5 border-t-2 border-l-2 border-accent-400 z-10" />
        <span className="absolute -top-px -right-px w-3.5 h-3.5 border-t-2 border-r-2 border-accent-400 z-10" />
        <span className="absolute -bottom-px -left-px w-3.5 h-3.5 border-b-2 border-l-2 border-accent-400 z-10" />
        <span className="absolute -bottom-px -right-px w-3.5 h-3.5 border-b-2 border-r-2 border-accent-400 z-10" />

        <div className="bg-[#0a1620] border border-accent-500/20 overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-accent-500/10">
            <Search size={12} className="text-accent-400/30 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-accent-400/20 tracking-wider focus:outline-none"
            />
            <div className="flex items-center gap-1 shrink-0">
              <Command size={9} className="text-accent-400/20" />
              <span className="text-[8px] text-accent-400/20 tracking-widest">K</span>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[9px] text-accent-400/25 tracking-widest">No commands found</div>
            ) : (
              groups.map(group => (
                <div key={group}>
                  <div className="px-3 pt-2 pb-0.5 text-[7px] text-accent-400/20 tracking-[0.3em] uppercase">{group}</div>
                  {filtered.filter(c => c.group === group).map(cmd => {
                    const idx = filtered.indexOf(cmd);
                    const active = idx === cursor;
                    return (
                      <div
                        key={cmd.id}
                        onClick={() => { cmd.action(); setOpen(false); }}
                        onMouseEnter={() => setCursor(idx)}
                        className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                          active ? "bg-accent-500/10" : "hover:bg-accent-500/5"
                        }`}
                      >
                        <span className={`shrink-0 ${active ? "text-accent-300" : "text-accent-400/30"}`}>
                          {cmd.icon}
                        </span>
                        <span className={`flex-1 text-[10px] tracking-wider ${active ? "text-white/90" : "text-white/55"}`}>
                          {cmd.label}
                        </span>
                        {cmd.key && (
                          <kbd className="shrink-0 px-1.5 py-0.5 border border-accent-500/20 text-[7px] text-accent-400/30 tracking-widest font-mono">
                            {cmd.key}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-accent-500/10 px-3 py-1.5 flex items-center gap-4">
            <span className="text-[7px] text-accent-400/20 tracking-widest">↑↓ navigate</span>
            <span className="text-[7px] text-accent-400/20 tracking-widest">↵ open</span>
            <span className="text-[7px] text-accent-400/20 tracking-widest">esc close</span>
            <span className="flex-1" />
            <span className="text-[7px] text-accent-400/15 tracking-widest">single keys work outside inputs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
