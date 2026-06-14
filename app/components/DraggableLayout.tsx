"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ColumnId = "left" | "center-left" | "center-right" | "right";

type WidgetSlot = { id: string; column: ColumnId; order: number };
type SizeMap   = Record<string, number>; // widget id → height in px (0 = auto)

// ── Persistence ───────────────────────────────────────────────────────────────

const DEFAULT_SLOTS: WidgetSlot[] = [
  { id: "clock",      column: "left",         order: 0 },
  { id: "pomodoro",   column: "left",         order: 1 },
  { id: "system",     column: "left",         order: 2 },
  { id: "prayer",     column: "left",         order: 3 },
  { id: "weather",    column: "left",         order: 4 },
  { id: "spotify",    column: "center-left",  order: 0 },
  { id: "news",       column: "center-left",  order: 1 },
  { id: "github",     column: "right",        order: 0 },
  { id: "transport",  column: "right",        order: 1 },
  { id: "missions",   column: "right",        order: 2 },
  { id: "calendar",   column: "right",        order: 3 },
  { id: "finance",    column: "right",        order: 4 },
  { id: "scratchpad", column: "right",        order: 5 },
  { id: "mood",       column: "center-right", order: 0 },
];

function loadSlots(): WidgetSlot[] {
  if (typeof window === "undefined") return DEFAULT_SLOTS;
  try {
    const raw = JSON.parse(localStorage.getItem("hud-layout") ?? "null");
    if (raw) {
      // Migrate old "center" column to "center-left"
      const saved: WidgetSlot[] = raw.map((s: WidgetSlot) =>
        (s.column as string) === "center" ? { ...s, column: "center-left" } : s
      );
      const knownIds = new Set(saved.map(s => s.id));
      const extras   = DEFAULT_SLOTS.filter(s => !knownIds.has(s.id));
      return [...saved, ...extras];
    }
  } catch {}
  return DEFAULT_SLOTS;
}

function saveSlots(slots: WidgetSlot[]) {
  try { localStorage.setItem("hud-layout", JSON.stringify(slots)); } catch {}
}

function loadSizes(): SizeMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("hud-sizes") ?? "null") ?? {}; } catch { return {}; }
}

function saveSizes(s: SizeMap) {
  try { localStorage.setItem("hud-sizes", JSON.stringify(s)); } catch {}
}

// ── Droppable column wrapper ──────────────────────────────────────────────────

function DroppableColumn({
  id, items, children, className = "",
}: {
  id: ColumnId;
  items: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-4 min-h-24 rounded transition-colors ${
          isOver ? "bg-accent-500/5 ring-1 ring-accent-400/20" : ""
        } ${className}`}
      >
        {children}
        {/* Always-present drop-zone footer so you can drop below all items */}
        {items.length === 0 && (
          <div className="flex items-center justify-center border border-dashed border-accent-400/10 rounded py-8 text-[8px] text-accent-400/20 tracking-widest">
            DRAG WIDGETS HERE
          </div>
        )}
      </div>
    </SortableContext>
  );
}

// ── Resize handle ─────────────────────────────────────────────────────────────

function ResizeHandle({ id, sizes, setSizes }: {
  id: string;
  sizes: SizeMap;
  setSizes: React.Dispatch<React.SetStateAction<SizeMap>>;
}) {
  const startY  = useRef(0);
  const startH  = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = (e.currentTarget as HTMLElement).closest("[data-widget-id]") as HTMLElement | null;
    startY.current = e.clientY;
    startH.current = el ? el.offsetHeight : (sizes[id] || 0);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY.current;
      const newH  = Math.max(80, startH.current + delta);
      setSizes(current => {
        const next = { ...current, [id]: newH };
        saveSizes(next);
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      title="Drag to resize"
    >
      <svg width="8" height="8" viewBox="0 0 8 8" className="text-accent-400/30">
        <line x1="1" y1="7" x2="7" y2="1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="4" y1="7" x2="7" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── Sortable widget wrapper ───────────────────────────────────────────────────

function SortableWidget({ id, children, sizes, setSizes }: {
  id: string;
  children: React.ReactNode;
  sizes: SizeMap;
  setSizes: React.Dispatch<React.SetStateAction<SizeMap>>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const h = sizes[id];

  return (
    <div
      ref={setNodeRef}
      data-widget-id={id}
      data-sized={h ? "true" : undefined}
      className="relative group"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        height: h ? `${h}px` : 'auto',
        overflow: h ? 'hidden' : 'visible',
      }}
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="widget-drag-handle absolute top-1.5 left-1.5 z-10 text-accent-400/0 group-hover:text-accent-400/25 hover:!text-accent-400/60 transition-colors p-0.5"
        title="Drag to reorder"
      >
        <GripVertical size={11} />
      </button>

      {children}

      {/* Resize handle */}
      <ResizeHandle id={id} sizes={sizes} setSizes={setSizes} />
    </div>
  );
}

// ── Main DraggableLayout ──────────────────────────────────────────────────────

export default function DraggableLayout({
  widgets,
  visibleIds,
}: {
  widgets: Record<string, React.ReactNode>;
  visibleIds: Set<string>;
}) {
  const [slots,    setSlots]    = useState<WidgetSlot[]>(DEFAULT_SLOTS);
  const [sizes,    setSizes]    = useState<SizeMap>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load persisted layout after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    setSlots(loadSlots());
    setSizes(loadSizes());
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Sorted visible IDs per column
  const colIds = useCallback((c: ColumnId) =>
    slots
      .filter(s => s.column === c && visibleIds.has(s.id))
      .sort((a, b) => a.order - b.order)
      .map(s => s.id),
    [slots, visibleIds]
  );

  const leftIds        = colIds("left");
  const centerLeftIds  = colIds("center-left");
  const centerRightIds = colIds("center-right");
  const rightIds       = colIds("right");

  const findColumn = (id: string): ColumnId | null =>
    slots.find(s => s.id === id)?.column ?? null;

  const isColumnId = (id: string): id is ColumnId =>
    id === "left" || id === "center-left" || id === "center-right" || id === "right";

  const handleDragStart = ({ active }: DragStartEvent) =>
    setActiveId(String(active.id));

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const activeId  = String(active.id);
    const overId    = String(over.id);
    if (activeId === overId) return;

    const activeCol = findColumn(activeId);
    if (!activeCol) return;

    // Dropped onto a column container (empty area)
    if (isColumnId(overId)) {
      if (activeCol === overId) return;
      setSlots(prev => {
        const colSlots  = prev.filter(s => s.column === overId).sort((a, b) => a.order - b.order);
        const maxOrder  = colSlots.length > 0 ? colSlots[colSlots.length - 1].order + 1 : 0;
        const next = prev.map(s =>
          s.id === activeId ? { ...s, column: overId, order: maxOrder } : s
        );
        saveSlots(next);
        return next;
      });
      return;
    }

    // Dropped onto another widget
    const overCol = findColumn(overId);
    if (!overCol || activeCol === overCol) return;

    setSlots(prev => {
      const overSlot = prev.find(s => s.id === overId);
      if (!overSlot) return prev;
      const insertOrder = overSlot.order + 0.5;
      const updated = prev.map(s =>
        s.id === activeId ? { ...s, column: overCol, order: insertOrder } : s
      );
      // Re-normalise target column
      const colItems = updated.filter(s => s.column === overCol).sort((a, b) => a.order - b.order);
      const normed   = updated.map(s => {
        if (s.column !== overCol) return s;
        return { ...s, order: colItems.findIndex(c => c.id === s.id) };
      });
      saveSlots(normed);
      return normed;
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId   = String(over.id);
    if (activeId === overId) return;

    // If dropped on column container, already handled in dragOver
    if (isColumnId(overId)) return;

    const activeCol = findColumn(activeId);
    const overCol   = findColumn(overId);
    if (!activeCol || !overCol || activeCol !== overCol) return;

    // Same-column reorder
    setSlots(prev => {
      const colSlots  = prev.filter(s => s.column === activeCol).sort((a, b) => a.order - b.order);
      const oldIdx    = colSlots.findIndex(s => s.id === activeId);
      const newIdx    = colSlots.findIndex(s => s.id === overId);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const reordered = arrayMove(colSlots, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
      const next      = prev.map(s => reordered.find(r => r.id === s.id) ?? s);
      saveSlots(next);
      return next;
    });
  };

  const renderWidget = (id: string) => {
    if (!visibleIds.has(id) || !widgets[id]) return null;
    return (
      <SortableWidget key={id} id={id} sizes={sizes} setSizes={setSizes}>
        {widgets[id]}
      </SortableWidget>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <DroppableColumn id="left" items={leftIds} className="w-full md:w-56 lg:w-64 xl:w-72 2xl:w-80 shrink-0">
          {leftIds.map(id => renderWidget(id))}
        </DroppableColumn>

        {/* Center area: two side-by-side sub-columns */}
        <div className="w-full md:flex-1 min-w-0 order-last md:order-none flex flex-col sm:flex-row gap-4">
          <DroppableColumn id="center-left" items={centerLeftIds} className="flex-1 min-w-0">
            {centerLeftIds.map(id => renderWidget(id))}
          </DroppableColumn>
          <DroppableColumn id="center-right" items={centerRightIds} className="flex-1 min-w-0">
            {centerRightIds.map(id => renderWidget(id))}
          </DroppableColumn>
        </div>

        <DroppableColumn id="right" items={rightIds} className="w-full md:w-56 lg:w-64 xl:w-72 2xl:w-80 shrink-0">
          {rightIds.map(id => renderWidget(id))}
        </DroppableColumn>
      </div>

      <DragOverlay>
        {activeId && visibleIds.has(activeId) && (
          <div className="opacity-75 rotate-1 shadow-2xl pointer-events-none">
            {widgets[activeId]}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
