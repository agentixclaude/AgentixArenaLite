import { useRef, useState } from 'react';

// Premiere-style scrubby number: drag left/right to change, click to type. Shift = 10x steps.
export default function Scrub({ value, onChange, min = -Infinity, max = Infinity, step = 1, decimals = 0, suffix = '', title }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; decimals?: number; suffix?: string; title?: string;
}) {
  const [typing, setTyping] = useState(false);
  const d = useRef<{ x: number; v: number; moved: boolean } | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, +v.toFixed(decimals)));
  if (typing) {
    return (
      <input className="scrub-in" autoFocus defaultValue={value.toFixed(decimals)} onBlur={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(clamp(v)); setTyping(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setTyping(false); }} />
    );
  }
  return (
    <span className="scrub-num" title={title ?? 'Drag to change, click to type'}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); d.current = { x: e.clientX, v: value, moved: false }; }}
      onPointerMove={(e) => {
        const s = d.current; if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 2) s.moved = true;
        if (s.moved) onChange(clamp(s.v + Math.round(dx / 2) * step * (e.shiftKey ? 10 : 1)));
      }}
      onPointerUp={() => { const s = d.current; d.current = null; if (s && !s.moved) setTyping(true); }}>
      {value.toFixed(decimals)}{suffix}
    </span>
  );
}
