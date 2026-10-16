import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobilePageHeader from "@/components/MobilePageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/obraUtils";
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Loader2,
  Building2,
  CalendarRange,
  Images,
} from "lucide-react";

export default function Relatorios() {
  const qc = useQueryClient();
  const [delId, setDelId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const relQ = useQuery({
    queryKey: ["relatorios"],
    queryFn: () => base44.entities.Relatorio.filter({}, "-created_date", 100),
  });

  const relatorios = relQ.data || [];

  const download = async (r) => {
    try {
      const res = await fetch(r.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.titulo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const view = (r) => window.open(r.file_url, "_blank");

  const confirmDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    try {
      await base44.entities.Relatorio.delete(delId);
      qc.invalidateQueries({ queryKey: ["relatorios"] });
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setDelId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-6">
      <MobilePageHeader />
      <h1
        className="font-display font-bold tracking-wide leading-none mb-1"
        style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
      >
        Central de Relatórios
      </h1>
      <p className="label-mono text-[0.6875rem] text-muted-foreground mb-6">
        Histórico de relatórios PDF gerados
      </p>

      {relQ.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : relatorios.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 flex flex-col items-center justify-center gap-3 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground max-w-sm">
            Nenhum relatório gerado ainda. Gere um relatório PDF a partir de uma
            obra para vê-lo aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatorios.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-sm bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-foreground truncate">
                    {r.titulo}
                  </h3>
                  <p className="label-mono text-[0.625rem] text-muted-foreground mt-0.5">
                    {formatDateTime(r.created_date)}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                {r.obra_nome && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{r.obra_nome}</span>
                  </div>
                )}
                {(r.data_inicio || r.data_fim) && (
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {r.data_inicio || "—"} → {r.data_fim || "—"}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Images className="w-3.5 h-3.5 shrink-0" />
                  <span>{r.total_fotos || 0} fotos</span>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => view(r)}
                  className="flex-1 h-10 border-border text-foreground hover:border-primary/60"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => download(r)}
                  className="flex-1 h-10 border-border text-foreground hover:border-primary/60"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Baixar
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setDelId(r.id)}
                  className="h-10 w-10 border-destructive/40 text-destructive hover:bg-destructive/10"
                  title="Excluir relatório"
                  aria-label="Excluir relatório"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Excluir Relatório
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm pt-1">
              O arquivo PDF será removido permanentemente. Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDelId(null)}
              className="border-border"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}