import React from "react";
import { Camera, UploadCloud, Loader2, ImagePlus } from "lucide-react";
import { Image } from "@/components/ui/image";

/**
 * Quick field upload dropzone panel (desktop right column).
 * Presentational — calls onPick to trigger the parent file input.
 */
export default function UploadPanel({ onPick, uploading, queue, disabled, suspended }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm tracking-wide uppercase">
          Envio Rápido
        </h3>
        <span className="label-mono text-[0.625rem] text-muted-foreground">
          Campo
        </span>
      </div>

      <button
        type="button"
        onClick={onPick}
        disabled={disabled || uploading || suspended}
        className="relative w-full rounded-md border-2 border-dashed border-border hover:border-primary/70 bg-surface/60 p-6 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="relative flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <span className="amber-pulse rounded-full p-2">
              <Camera className="w-7 h-7 text-primary" />
            </span>
          )}
        </span>
        <span className="font-display font-bold text-sm text-foreground">
          {uploading ? "Enviando..." : "Abrir Câmera / Upload"}
        </span>
        <span className="label-mono text-[0.625rem] text-muted-foreground">
          Toque para capturar ou selecionar
        </span>
      </button>

      {suspended && (
        <p className="text-[0.6875rem] text-destructive label-mono text-center">
          Conta suspensa — envio bloqueado
        </p>
      )}

      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <span className="label-mono text-[0.625rem] text-muted-foreground">
            Fila recente
          </span>
          <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[260px] pr-1">
          {queue.length === 0 && (
            <div className="col-span-3 h-24 rounded-sm border border-dashed border-border/60 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-muted-foreground/50" />
            </div>
          )}
          {queue.map((q) => (
            <div
              key={q.id || q.url}
              className="relative aspect-square rounded-sm overflow-hidden border border-border bg-surface"
            >
              <Image
                src={q.url}
                alt="envio"
                className="w-full h-full object-cover"
                fittingType="fill"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}