"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { CHANNEL_LABELS, type CommChannel } from "@/lib/communication";

type Props = {
  value: CommChannel[];
  onChange: (next: CommChannel[]) => void;
  placeholder?: string;
  className?: string;
};

export default function ChannelMultiSelect({
  value, onChange, placeholder = "Canaux…", className
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const toggle = (c: CommChannel) => {
    if (value.includes(c)) onChange(value.filter(x => x !== c));
    else onChange([...value, c]);
  };

  const summary =
    value.length === 0
      ? placeholder
      : value.map(c => CHANNEL_LABELS[c]).join(", ");

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        className="input w-64 !pr-8 truncate text-left"
        onClick={() => setOpen(v => !v)}
        title={summary}
      >
        {summary}
        <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-[22rem] rounded-md border border-white/10 bg-zinc-900 p-2 shadow-xl">
          <div className="grid grid-cols-2 gap-1">
            {Object.keys(CHANNEL_LABELS).map(k => {
              const key = k as CommChannel;
              const selected = value.includes(key);
              return (
                <label
                  key={key}
                  className={`cursor-pointer rounded-md px-2 py-1 text-sm flex items-center gap-2 border
                    ${selected ? "bg-white/10 border-white/15" : "bg-transparent border-transparent hover:bg-white/5"}
                  `}
                >
                  <input
                    className="accent-white/90"
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(key)}
                  />
                  <span className="flex-1 truncate">{CHANNEL_LABELS[key]}</span>
                  {selected && <Check size={14} className="opacity-80" />}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
