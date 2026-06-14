"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
};

// Track open modals by unique instance ID — Set is idempotent so StrictMode double-runs are safe
const _openIds = new Set<number>();
const _subs = new Set<() => void>();
function _notify() { _subs.forEach((f) => f()); }
let _nextId = 0;

export function useAnyModalOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const cb = () => setOpen(_openIds.size > 0);
    _subs.add(cb);
    cb(); // sync initial state
    return () => { _subs.delete(cb); };
  }, []);
  return open;
}

// Each time any modal opens it grabs the next cascade slot
let _cascade = 0;
const SLOTS = [
  { x: 0,    y: 0   },
  { x: 60,   y: 50  },
  { x: -70,  y: 80  },
  { x: 110,  y: -50 },
  { x: -110, y: -60 },
  { x: 30,   y: 120 },
];

// Global z-index counter so clicking a modal brings it to front
let _zTop = 51;

export default function HudModal({ isOpen, onClose, title, children, width = "380px" }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [z, setZ] = useState(51);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const instanceId = useRef(++_nextId);

  // Mount/unmount with transition — pick a fresh cascade slot on each open
  useEffect(() => {
    const id = instanceId.current;
    if (isOpen) {
      const slot = SLOTS[_cascade++ % SLOTS.length];
      setPos(slot);
      setZ(++_zTop);
      setMounted(true);
      _openIds.add(id); _notify();
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => {
        cancelAnimationFrame(raf);
        _openIds.delete(id); _notify();
      };
    } else {
      setVisible(false);
      _openIds.delete(id); _notify();
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Global drag tracking
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPos({
        x: dragStart.current.px + e.clientX - dragStart.current.mx,
        y: dragStart.current.py + e.clientY - dragStart.current.my,
      });
    };
    const onUp = () => { dragStart.current = null; setDragging(false); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onTitleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
    setZ(++_zTop);
  };

  const bringToFront = () => {
    if (z < _zTop) setZ(++_zTop);
  };

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: z }}
    >
      <div
        onMouseDown={bringToFront}
        className={`absolute max-w-[90vw] pointer-events-auto ${!dragging ? "transition-all duration-200" : ""} ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        style={{
          width,
          top: "50%",
          left: "50%",
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
        }}
      >
        {/* Corner brackets */}
        <span className="absolute -top-px -left-px w-3.5 h-3.5 border-t-2 border-l-2 border-accent-400" />
        <span className="absolute -top-px -right-px w-3.5 h-3.5 border-t-2 border-r-2 border-accent-400" />
        <span className="absolute -bottom-px -left-px w-3.5 h-3.5 border-b-2 border-l-2 border-accent-400" />
        <span className="absolute -bottom-px -right-px w-3.5 h-3.5 border-b-2 border-r-2 border-accent-400" />

        <div className="bg-[#0a1620] border border-accent-500/20">
          {/* Header — drag handle */}
          <div
            onMouseDown={onTitleMouseDown}
            className={`flex items-center justify-between px-4 py-2.5 border-b border-accent-500/10 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
              <span className="text-[9px] text-accent-400/70 tracking-[0.25em] uppercase font-mono">
                {title}
              </span>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="text-accent-400/30 hover:text-accent-300 transition-colors p-0.5"
            >
              <X size={12} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
