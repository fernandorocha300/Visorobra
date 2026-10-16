import React from "react";
import { formatMb } from "@/lib/obraUtils";

/**
 * Industrial storage meter with hatch marks.
 * usedMb / limitMb
 */
export default function StorageGauge({ usedMb = 0, limitMb = 1000 }) {
  const pct = Math.min(100, limitMb > 0 ? (usedMb / limitMb) * 100 : 0);
  const danger = pct >= 90;
  const warn = pct >= 70 && !danger;

  const barColor = danger
    ? "bg-destructive"
    : warn
    ? "bg-primary"
    : "bg-success";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-mono text-[0.6875rem] text-muted-foreground">
          Armazenamento
        </span>
        <span className="label-mono text-[0.6875rem] text-foreground/80">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="relative h-3 w-full rounded-sm bg-surface border border-border overflow-hidden">
        <div
          className={`hatch-meter absolute inset-0 ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex justify-between px-px pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="w-px h-full bg-background/40"
              style={{ marginLeft: i === 0 ? 0 : "auto" }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] font-medium text-foreground">
          {formatMb(usedMb)}
        </span>
        <span className="text-[0.75rem] text-muted-foreground">
          / {formatMb(limitMb)}
        </span>
      </div>
    </div>
  );
}