interface HudPanelProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function HudPanel({ children, title, icon, actions, className = "" }: HudPanelProps) {
  return (
    <div className={`relative bg-[#0a1620] border border-cyan-500/20 p-4 ${className}`}>
      <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[9px] text-cyan-400/50 tracking-[0.3em] uppercase min-w-0 overflow-hidden">
            {icon && <span className="text-cyan-400/60 shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </div>
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
