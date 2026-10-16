import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Trash2,
  Save,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  User,
  Tag,
  CalendarClock,
  HardDrive,
  Maximize2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatKb } from "@/lib/obraUtils";

/**
 * Fullscreen photo lightbox with zoom/pan, metadata (author, date/time,
 * category, file size), editable observation, download and delete (owner only).
 */
export default function PhotoDetailDialog({
  foto,
  categoriaNome,
  authorName,
  canDelete = true,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onDownload,
}) {
  const [obs, setObs] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setObs(foto?.observacao || "");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [foto]);

  const toggleZoom = useCallback(() => {
    setZoom((z) => (z > 1 ? 1 : 2.5));
    setPan({ x: 0, y: 0 });
  }, []);

  const onPointerDown = (e) => {
    if (zoom <= 1) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!dragging.current || zoom <= 1) return;
    setPan((p) => ({
      x: p.x + (e.clientX - last.current.x),
      y: p.y + (e.clientY - last.current.y),
    }));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const handleDownload = () => {
    if (onDownload) return onDownload(foto);
    const url = foto?.url_imagem;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `foto_${(foto.data_registro || foto.id || "").slice(0, 10)}.webp`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!foto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 max-w-none w-screen h-screen p-0 rounded-none border-0 bg-background/95 backdrop-blur-sm flex flex-col">
        <DialogTitle className="sr-only">Visualização da foto</DialogTitle>

        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 h-14 border-b border-border bg-surface/80">
          <CalendarClock className="w-4 h-4 text-primary" />
          <span className="font-display font-bold tracking-wide text-sm truncate">
            {formatDateTime(foto.data_registro || foto.created_date)}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(2)))}
              disabled={zoom <= 1}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Diminuir zoom"
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="label-mono text-[0.625rem] text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.min(5, +(z + 0.5).toFixed(2)))}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleZoom}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Ajustar / tela cheia"
              aria-label="Ajustar / tela cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="h-9 border-border text-foreground hover:border-primary/60"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Baixar</span>
            </Button>
            {canDelete && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => onDelete(foto)}
                className="h-9 w-9 border-destructive/50 text-destructive hover:bg-destructive/10"
                title="Excluir foto"
                aria-label="Excluir foto"
                >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_360px]">
          {/* Image stage */}
          <div
            className="relative min-h-0 overflow-hidden bg-background flex items-center justify-center select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onDoubleClick={toggleZoom}
            style={{ cursor: zoom > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in" }}
          >
            <div
              className="max-w-full max-h-full transition-transform duration-150"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              <Image
                src={foto.url_imagem}
                alt={foto.observacao || "Foto"}
                className="max-w-[88vw] lg:max-w-[60vw] max-h-[78vh] object-contain"
                fittingType="fit"
              />
            </div>
          </div>

          {/* Details panel */}
          <aside className="border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5 flex-1">
              {/* Metadata */}
              <section className="space-y-3">
                <h3 className="label-mono text-[0.6875rem] text-muted-foreground">
                  Informações
                </h3>
                <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Capturado por">
                  {authorName || "—"}
                </MetaRow>
                <MetaRow icon={<CalendarClock className="w-3.5 h-3.5" />} label="Data / Hora">
                  {formatDateTime(foto.data_registro || foto.created_date)}
                </MetaRow>
                <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Categoria">
                  {categoriaNome || "—"}
                </MetaRow>
                <MetaRow icon={<HardDrive className="w-3.5 h-3.5" />} label="Tamanho">
                  {formatKb(foto.tamanho_kb || 0)}
                </MetaRow>
              </section>

              <div className="h-px bg-border" />

              {/* Observation */}
              <section className="space-y-2">
                <label className="label-mono text-[0.6875rem] text-muted-foreground">
                  Observação
                </label>
                <Textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Adicione uma observação sobre esta foto..."
                  rows={6}
                  className="bg-surface border-border resize-none"
                />
              </section>
            </div>

            <div className="p-4 border-t border-border bg-surface/60">
              <Button
                onClick={() => onSave(foto.id, obs)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Salvar observação
              </Button>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary/80">{icon}</span>
      <div className="min-w-0">
        <div className="label-mono text-[0.625rem] text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{children}</div>
      </div>
    </div>
  );
}