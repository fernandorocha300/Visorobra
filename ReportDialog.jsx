import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, Share2, Loader2, CalendarRange } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/obraUtils";

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function fetchImageAsJpeg(url) {
  const img = await loadImg(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportDialog({
  open,
  onOpenChange,
  obra,
  categorias,
  fotos,
  responsavel,
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selCats, setSelCats] = useState({});
  const [busy, setBusy] = useState(false);
  const [lastPdf, setLastPdf] = useState(null);
  const qc = useQueryClient();

  const catName = (id) => categorias.find((c) => c.id === id)?.nome || "—";

  const filtered = (fotos || []).filter((f) => {
    const d = (f.data_registro || f.created_date || "").slice(0, 10);
    if (start && d < start) return false;
    if (end && d > end) return false;
    const sel = Object.keys(selCats).filter((k) => selCats[k]);
    if (sel.length && !sel.includes(f.categoria_id)) return false;
    return true;
  });

  const toggleCat = (id) =>
    setSelCats((s) => ({ ...s, [id]: !s[id] }));

  const buildPdf = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      const usableW = pageW - margin * 2;
      const colW = (usableW - 4) / 2;
      const imgH = 52;
      const cellH = imgH + 20;
      const colX = [margin, margin + colW + 4];

      const drawHeader = (first) => {
        if (!first) return;
        doc.setFillColor(11, 14, 20);
        doc.rect(0, 0, pageW, 24, "F");
        doc.setTextColor(245, 158, 11);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("RELATÓRIO DIÁRIO DE OBRA", margin, 11);
        doc.setTextColor(230, 230, 230);
        doc.setFontSize(9);
        doc.text(`Obra: ${obra?.nome_obra || "—"}`, margin, 17);
        doc.text(`Emissão: ${formatDate(new Date().toISOString())}`, margin, 21);
        doc.text(`Responsável: ${responsavel || "—"}`, pageW - margin, 17, {
          align: "right",
        });
        doc.text(`Fotos: ${filtered.length}`, pageW - margin, 21, {
          align: "right",
        });
      };

      let y = 32;
      drawHeader(true);

      for (let i = 0; i < filtered.length; i++) {
        if (y + cellH > pageH - 14) {
          doc.addPage();
          y = 16;
        }
        const f = filtered[i];
        const cx = colX[i % 2];

        doc.setDrawColor(219, 222, 228);
        doc.setFillColor(245, 247, 250);
        doc.rect(cx, y, colW, cellH, "FD");

        try {
          const dataUrl = await fetchImageAsJpeg(f.url_imagem);
          doc.addImage(dataUrl, "JPEG", cx + 3, y + 3, colW - 6, imgH, undefined, "FAST");
        } catch (e) {
          console.warn("img load failed", e);
        }

        doc.setTextColor(20, 20, 20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(
          formatDateTime(f.data_registro || f.created_date),
          cx + 3,
          y + imgH + 7
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        const obs = (f.observacao || "(sem observação)").slice(0, 90);
        doc.text(
          doc.splitTextToSize(`Cat: ${catName(f.categoria_id)} | ${obs}`, colW - 6),
          cx + 3,
          y + imgH + 12
        );

        if (i % 2 === 1) y += cellH + 4;
        else if (i === filtered.length - 1) y += cellH + 4;
      }

      const total = doc.internal.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(`${p}/${total}`, pageW - margin, pageH - 5, { align: "right" });
      }

      const blob = doc.output("blob");
      const filename = `RDO_${(obra?.nome_obra || "obra").replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      setLastPdf({ blob, filename });
      downloadBlob(blob, filename);

      // Save to report history
      try {
        const file = new File([blob], filename, { type: "application/pdf" });
        const { file_url } = await base44.integrations.Core.UploadPublicFile({
          file,
        });
        await base44.entities.Relatorio.create({
          titulo: filename.replace(/\.pdf$/, ""),
          obra_id: obra?.id || "",
          obra_nome: obra?.nome_obra || "",
          data_inicio: start || "",
          data_fim: end || "",
          total_fotos: filtered.length,
          file_url,
        });
        qc.invalidateQueries({ queryKey: ["relatorios"] });
      } catch (e2) {
        console.warn("Falha ao salvar histórico do relatório", e2);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const shareWhats = async () => {
    if (!lastPdf) return;
    const file = new File([lastPdf.blob], lastPdf.filename, {
      type: "application/pdf",
    });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "RDO",
          text: `Relatório de Obra: ${obra?.nome_obra || ""}`,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    const msg = encodeURIComponent(
      `Relatório de Obra: ${obra?.nome_obra || ""} (${filtered.length} fotos)`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-lg flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            Gerar Relatório PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-start" className="label-mono text-[0.6875rem]">
                De
              </Label>
              <Input
                id="r-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bg-surface border-border h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-end" className="label-mono text-[0.6875rem]">
                Até
              </Label>
              <Input
                id="r-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-surface border-border h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="label-mono text-[0.6875rem] text-muted-foreground">
              Categorias ({Object.keys(selCats).filter((k) => selCats[k]).length}{" "}
              selecionadas — vazio = todas)
            </Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {categorias.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-sm border border-border bg-surface px-2.5 py-2 cursor-pointer hover:border-primary/50"
                >
                  <Checkbox
                    checked={!!selCats[c.id]}
                    onCheckedChange={() => toggleCat(c.id)}
                  />
                  <span className="text-sm truncate">{c.nome}</span>
                </label>
              ))}
              {categorias.length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground py-2">
                  Sem categorias.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-sm border border-border bg-surface/60 px-3 py-2">
            <span className="label-mono text-[0.6875rem] text-muted-foreground">
              Fotos no relatório
            </span>
            <span className="ml-2 font-display font-bold text-primary">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              onClick={buildPdf}
              disabled={busy || filtered.length === 0}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-1.5" />
              )}
              {busy ? "Gerando..." : "Gerar e Baixar PDF"}
            </Button>
            <Button
              onClick={shareWhats}
              disabled={!lastPdf}
              variant="outline"
              className="flex-1 border-success/50 text-success hover:bg-success/10"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Compartilhar via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}