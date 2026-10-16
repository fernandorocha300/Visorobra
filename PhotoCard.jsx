import React from "react";
import { Camera, CalendarClock } from "lucide-react";
import { Image } from "@/components/ui/image";
import { formatDateTimeCard, formatKb } from "@/lib/obraUtils";

/**
 * High-contrast photo card with stamp-style date/time + category badges.
 */
export default function PhotoCard({ foto, categoriaNome, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full text-left overflow-hidden rounded-md border border-border bg-card hover:border-primary/60 transition-colors"
    >
      <div className="relative aspect-[4/3] bg-surface overflow-hidden">
        <Image
          src={foto.url_thumbnail || foto.url_imagem}
          alt={foto.observacao || "Foto de obra"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          fittingType="fill"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />
        {/* Category stamp */}
        {categoriaNome && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-background/85 border border-border label-mono text-[0.625rem] text-primary">
            <Camera className="w-3 h-3" />
            {categoriaNome}
          </span>
        )}
        {/* Date + time stamp */}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-background/85 border border-border label-mono text-[0.625rem] text-foreground/80">
          <CalendarClock className="w-3 h-3" />
          {formatDateTimeCard(foto.data_registro || foto.created_date)}
        </span>
      </div>
      {foto.observacao && (
        <p className="px-2.5 py-2 text-[0.75rem] text-muted-foreground line-clamp-2 leading-snug">
          {foto.observacao}
        </p>
      )}
      {!foto.observacao && (
        <p className="px-2.5 py-1.5 text-[0.6875rem] text-muted-foreground/60 label-mono">
          {formatKb(foto.tamanho_kb || 0)}
        </p>
      )}
    </button>
  );
}