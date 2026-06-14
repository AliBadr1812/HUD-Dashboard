"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import HudPanel from "./HudPanel";

const KEY = "hud-scratchpad";

function load(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) ?? "";
}

export default function Scratchpad() {
  const [text, setText]       = useState("");
  const [saved, setSaved]     = useState(true);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);
  const debounceRef           = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setText(load());
  }, []);

  // ARIA tool: write/append via CustomEvent
  useEffect(() => {
    const handler = (e: Event) => {
      const { content, mode } = (e as CustomEvent).detail ?? {};
      if (!content) return;
      setText(prev => {
        const next = mode === "replace" ? content : (prev ? `${prev}\n\n${content}` : content);
        localStorage.setItem(KEY, next);
        return next;
      });
      setSaved(true);
    };
    window.addEventListener("aria:scratchpad_write", handler);
    return () => window.removeEventListener("aria:scratchpad_write", handler);
  }, []);

  const onChange = (val: string) => {
    setText(val);
    setSaved(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(KEY, val);
      setSaved(true);
    }, 400);
  };

  const clear = () => {
    setText("");
    localStorage.setItem(KEY, "");
    setSaved(true);
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [text]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const actions = (
    <div className="flex items-center gap-2">
      <span className={`text-[7px] tracking-widest transition-colors ${saved ? "text-accent-400/20" : "text-amber-400/50"}`}>
        {saved ? "SAVED" : "···"}
      </span>
      {text && (
        <button onClick={clear} className="text-accent-400/20 hover:text-red-400/50 transition-colors p-0.5">
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );

  return (
    <HudPanel title="SCRATCHPAD" icon={<FileText size={10} />} actions={actions}>
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder="Start typing..."
          rows={4}
          className="w-full bg-transparent border border-accent-500/10 focus:border-accent-500/25 text-[10px] text-white/70 placeholder:text-accent-400/12 px-2 py-1.5 resize-none focus:outline-none leading-relaxed overflow-hidden transition-colors"
          style={{ minHeight: "80px", maxHeight: "200px" }}
        />
        {wordCount > 0 && (
          <div className="text-[7px] text-accent-400/20 tracking-widest">
            {wordCount} {wordCount === 1 ? "word" : "words"} · {text.length} chars
          </div>
        )}
      </div>
    </HudPanel>
  );
}
