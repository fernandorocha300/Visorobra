import React, { useState, useMemo, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { processImage, fileKb } from "@/lib/imageProcessor";
import { addPending } from "@/lib/offlineQueue";
import { planoNome } from "@/lib/plans";
import PhotoCard from "@/components/PhotoCard";
import UploadPanel from "@/components/UploadPanel";
import PhotoDetailDialog from "@/components/PhotoDetailDialog";
import ReportDialog from "@/components/ReportDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MobileSelect,
  MobileSelectTrigger,
  MobileSelectValue,
  MobileSelectContent,
  MobileSelectItem,
} from "@/components/MobileSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  Camera,
  Plus,
  Images,
  FolderTree,
  HardHat,
  FileText,
  Search,
  CalendarRange,
  RefreshCw,
  WifiOff,
  Wifi,
  AlertTriangle,
  ArrowUpDown,
  Settings,
} from "lucide-react";
import { statusObraLabel } from "@/lib/obraUtils";

const DATE_FILTERS = [
  { id: "all", label: "Todas as datas" },
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "custom", label: "Personalizado" },
];

export default function Home() {
  const ctx = useOutletContext();
  const {
    selectedObra,
    refreshStorage,
    suspended,
    user,
    isAdmin,
    isMobile,
    openNovaObra,
    usedMb = 0,
    limitMb = 5120,
  } = ctx;
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const isMob = useIsMobile();

  const [filterCat, setFilterCat] = useState("all");
  const [queue, setQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [detailPhoto, setDetailPhoto] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [novaCatOpen, setNovaCatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [limitAlertOpen, setLimitAlertOpen] = useState(false);

  // advanced filters
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");

  const obraId = selectedObra?.id;
  const plano = user?.plano || "BASICO";

  const { isOnline, pendingCount, syncing, sync, refreshCount } = useOfflineSync({
    onSynced: () => {
      if (obraId) qc.invalidateQueries({ queryKey: ["fotos", obraId] });
      refreshStorage();
    },
  });

  const categoriasQ = useQuery({
    queryKey: ["categorias", obraId],
    queryFn: () =>
      base44.entities.Categoria.filter({ obra_id: obraId }, "-created_date", 100),
    enabled: !!obraId,
  });

  const fotosQ = useQuery({
    queryKey: ["fotos", obraId],
    queryFn: () =>
      base44.entities.Foto.filter({ obra_id: obraId }, "-created_date", 500),
    enabled: !!obraId,
  });

  const categorias = categoriasQ.data || [];
  const fotos = fotosQ.data || [];

  const catName = (id) => categorias.find((c) => c.id === id)?.nome || "—";

  const atLimit = usedMb >= limitMb && limitMb > 0;

  const filteredFotos = useMemo(() => {
    let list = fotos;
    if (filterCat !== "all") list = list.filter((f) => f.categoria_id === filterCat);

    const q = searchText.trim().toLowerCase();
    if (q) list = list.filter((f) => (f.observacao || "").toLowerCase().includes(q));

    if (dateFilter !== "all" || customStart || customEnd) {
      const now = new Date();
      list = list.filter((f) => {
        const d = new Date(f.data_registro || f.created_date);
        if (isNaN(d.getTime())) return false;
        if (dateFilter === "hoje") {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return d >= start;
        }
        if (dateFilter === "semana") {
          return now.getTime() - d.getTime() <= 7 * 24 * 3600 * 1000;
        }
        if (dateFilter === "mes") {
          return now.getTime() - d.getTime() <= 30 * 24 * 3600 * 1000;
        }
        if (dateFilter === "custom" || (customStart && customEnd)) {
          const s = customStart ? new Date(customStart + "T00:00:00") : null;
          const e = customEnd ? new Date(customEnd + "T23:59:59") : null;
          if (s && d < s) return false;
          if (e && d > e) return false;
        }
        return true;
      });
    }

    return [...list].sort((a, b) => {
      const da = new Date(a.data_registro || a.created_date).getTime() || 0;
      const db = new Date(b.data_registro || b.created_date).getTime() || 0;
      return sortOrder === "recent" ? db - da : da - db;
    });
  }, [fotos, filterCat, searchText, dateFilter, customStart, customEnd, sortOrder]);

  const openPicker = () => {
    if (suspended) return;
    if (atLimit) {
      setLimitAlertOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !obraId) return;
    if (suspended || atLimit) return;
    setUploading(true);
    try {
      let defaultCatId = filterCat !== "all" ? filterCat : null;
      if (!defaultCatId) {
        let cat = categorias[0];
        if (!cat) {
          cat = await base44.entities.Categoria.create({
            obra_id: obraId,
            nome: "Geral",
          });
          qc.invalidateQueries({ queryKey: ["categorias", obraId] });
        }
        defaultCatId = cat.id;
      }
      for (const file of files) {
        const ts = Date.now();
        const processed = await processImage(file, {
          obraName: selectedObra.nome_obra,
          timestamp: ts,
        });
        const kb = fileKb(processed);

        if (isOnline) {
          const { file_url } = await base44.integrations.Core.UploadPublicFile({
            file: processed,
          });
          const foto = await base44.entities.Foto.create({
            categoria_id: defaultCatId,
            obra_id: obraId,
            url_imagem: file_url,
            url_thumbnail: file_url,
            tamanho_kb: kb,
            data_registro: new Date(ts).toISOString(),
          });
          setQueue((q) => [{ id: foto.id, url: file_url }, ...q].slice(0, 9));
          qc.invalidateQueries({ queryKey: ["fotos", obraId] });
        } else {
          const id = `off_${ts}_${Math.random().toString(36).slice(2, 8)}`;
          await addPending({
            id,
            obra_id: obraId,
            categoria_id: defaultCatId,
            blob: processed,
            obra_name: selectedObra.nome_obra,
            data_registro: new Date(ts).toISOString(),
            tamanho_kb: kb,
            created_at: ts,
          });
          setQueue((q) =>
            [{ id, url: URL.createObjectURL(processed) }, ...q].slice(0, 9)
          );
          refreshCount();
        }
      }
      if (isOnline) refreshStorage();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveObs = async (fotoId, obs) => {
    await base44.entities.Foto.update(fotoId, { observacao: obs });
    qc.invalidateQueries({ queryKey: ["fotos", obraId] });
    setDetailOpen(false);
  };

  const deleteFotoMutation = useMutation({
    mutationFn: (foto) => base44.entities.Foto.delete(foto.id),
    onMutate: async (foto) => {
      await qc.cancelQueries({ queryKey: ["fotos", obraId] });
      await qc.cancelQueries({ queryKey: ["fotos-all"] });
      const previous = qc.getQueryData(["fotos", obraId]);
      const previousAll = qc.getQueryData(["fotos-all"]);
      qc.setQueryData(["fotos", obraId], (old = []) =>
        old.filter((f) => f.id !== foto.id)
      );
      qc.setQueryData(["fotos-all"], (old) =>
        old ? old.filter((f) => f.id !== foto.id) : old
      );
      return { previous, previousAll };
    },
    onError: (_err, _foto, ctx) => {
      if (ctx?.previous) qc.setQueryData(["fotos", obraId], ctx.previous);
      if (ctx?.previousAll) qc.setQueryData(["fotos-all"], ctx.previousAll);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["fotos", obraId] });
      refreshStorage();
    },
  });

  const handleDeleteFoto = (foto) => {
    deleteFotoMutation.mutate(foto);
    setDetailOpen(false);
    setDetailPhoto(null);
  };

  const handleDownloadFoto = async (foto) => {
    if (!foto?.url_imagem) return;
    try {
      const res = await fetch(foto.url_imagem);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foto_${(foto.data_registro || foto.id || "").slice(0, 10)}.webp`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const openDetail = (foto) => {
    setDetailPhoto(foto);
    setDetailOpen(true);
  };

  if (!obraId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-5">
        <div className="w-16 h-16 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
          <HardHat className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl mb-1">
            Nenhuma obra selecionada
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Crie sua primeira obra para começar a registrar fotos de campo.
          </p>
        </div>
        <Button
          onClick={openNovaObra}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Obra
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {isMob && (
        <div className="flex items-center gap-2 px-5 pt-4">
          <div className="w-8 h-8 rounded-sm bg-primary/15 border border-primary/40 flex items-center justify-center">
            <HardHat className="w-4 h-4 text-primary" />
          </div>
          <div className="font-display font-bold tracking-wide text-base">
            OBRA<span className="text-primary">FOTO</span>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={onFileChange}
        className="hidden"
      />

      {/* Arrival band */}
      <div className="border-b border-border bg-surface/60 px-5 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border label-mono text-[0.625rem] ${
                  selectedObra.status === "CONCLUIDA"
                    ? "bg-success/15 border-success/40 text-success"
                    : "bg-primary/15 border-primary/40 text-primary"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {statusObraLabel(selectedObra.status)}
              </span>
              <span className="label-mono text-[0.625rem] text-muted-foreground">
                {selectedObra.endereco || "Sem endereço"}
              </span>
              <span className="label-mono text-[0.625rem] text-muted-foreground">
                · {planoNome(plano)}
              </span>
            </div>
            <h1
              className="font-display font-bold tracking-wide leading-none mb-3"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              {selectedObra.nome_obra}
            </h1>
            <div className="flex items-end gap-6">
              <div>
                <div
                  className="font-display font-bold text-foreground leading-none"
                  style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}
                >
                  {fotos.length}
                </div>
                <div className="label-mono text-[0.625rem] text-muted-foreground mt-1">
                  Fotos
                </div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <div
                  className="font-display font-bold text-foreground leading-none"
                  style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}
                >
                  {categorias.length}
                </div>
                <div className="label-mono text-[0.625rem] text-muted-foreground mt-1">
                  Categorias
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center justify-center h-11 w-11 rounded-md border border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                title="Painel do Administrador"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <Button
              onClick={() => setReportOpen(true)}
              variant="outline"
              className="border-border text-foreground hover:border-primary/60 h-11 px-4 font-display font-bold tracking-wide"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Relatório PDF
            </Button>
            <Button
              onClick={openPicker}
              disabled={suspended}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 font-display font-bold tracking-wide"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              + Nova Foto
            </Button>
          </div>
        </div>

        {/* Status banners */}
        <div className="mt-4 flex flex-wrap gap-2">
          {atLimit && (
            <button
              onClick={() => setLimitAlertOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-destructive/40 bg-destructive/10 text-destructive label-mono text-[0.6875rem] hover:bg-destructive/20"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Armazenamento cheio — upload bloqueado
            </button>
          )}
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary/40 bg-primary/10 text-primary label-mono text-[0.6875rem]">
              <WifiOff className="w-3.5 h-3.5" />
              Sem conexão — fotos serão sincronizadas depois
            </span>
          )}
          {pendingCount > 0 && (
            <button
              onClick={sync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-primary/40 bg-primary/10 text-primary label-mono text-[0.6875rem] hover:bg-primary/20 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing
                ? "Sincronizando..."
                : `${pendingCount} foto(s) aguardando sincronização`}
              {isOnline && !syncing && " · tocar para enviar"}
            </button>
          )}
          {isOnline && pendingCount === 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-success/70 label-mono text-[0.625rem]">
              <Wifi className="w-3 h-3" />
              Online
            </span>
          )}
        </div>
      </div>

      {/* Body grid */}
      <div className="flex-1 px-5 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Left: filters + grid */}
          <div className="min-w-0">
            {/* Advanced search/filter bar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar nas observações..."
                  className="pl-8 bg-card border-border h-10"
                />
              </div>
              <MobileSelect value={dateFilter} onValueChange={setDateFilter} title="Filtrar por data">
                <MobileSelectTrigger className="bg-card border-border h-10 sm:w-44">
                  <CalendarRange className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <MobileSelectValue />
                </MobileSelectTrigger>
                <MobileSelectContent className="bg-popover border-border">
                  {DATE_FILTERS.map((d) => (
                    <MobileSelectItem key={d.id} value={d.id}>
                      {d.label}
                    </MobileSelectItem>
                  ))}
                </MobileSelectContent>
              </MobileSelect>
              <MobileSelect value={sortOrder} onValueChange={setSortOrder} title="Ordenar fotos">
                <MobileSelectTrigger className="bg-card border-border h-10 sm:w-44">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <MobileSelectValue />
                </MobileSelectTrigger>
                <MobileSelectContent className="bg-popover border-border">
                  <MobileSelectItem value="recent">Mais recentes</MobileSelectItem>
                  <MobileSelectItem value="old">Mais antigas</MobileSelectItem>
                </MobileSelectContent>
              </MobileSelect>
            </div>

            {dateFilter === "custom" && (
              <div className="flex items-center gap-2 mb-3">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-card border-border h-9 w-40"
                />
                <span className="text-muted-foreground text-sm">até</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-card border-border h-9 w-40"
                />
              </div>
            )}

            {/* Category pills */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
              <CatPill
                active={filterCat === "all"}
                onClick={() => setFilterCat("all")}
                label="Todas"
                count={fotos.length}
              />
              {categorias.map((c) => (
                <CatPill
                  key={c.id}
                  active={filterCat === c.id}
                  onClick={() => setFilterCat(c.id)}
                  label={c.nome}
                  count={fotos.filter((f) => f.categoria_id === c.id).length}
                />
              ))}
              <button
                onClick={() => setNovaCatOpen(true)}
                className="shrink-0 inline-flex items-center gap-1 px-3 h-10 rounded-sm border border-dashed border-border hover:border-primary/60 text-muted-foreground hover:text-primary label-mono text-[0.6875rem] transition-colors"
              >
                <Plus className="w-3 h-3" />
                Categoria
              </button>
            </div>

            {/* Photo grid */}
            {filteredFotos.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-16 flex flex-col items-center justify-center gap-3 text-center">
                <Images className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {fotos.length === 0
                    ? "Nenhuma foto enviada ainda. Toque em upload para começar."
                    : "Nenhuma foto corresponde aos filtros."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredFotos.map((f) => (
                  <PhotoCard
                    key={f.id}
                    foto={f}
                    categoriaNome={catName(f.categoria_id)}
                    onClick={() => openDetail(f)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: upload panel (desktop) */}
          {!isMob && (
            <div className="h-full">
              <UploadPanel
                onPick={openPicker}
                uploading={uploading}
                queue={queue}
                suspended={suspended || atLimit}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom thumb bar */}
      {isMob && (
        <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur px-4 py-3 safe-bottom">
          <Button
            onClick={openPicker}
            disabled={uploading || suspended}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold tracking-wide amber-pulse"
          >
            <Camera className="w-5 h-5 mr-2" />
            {uploading ? "Enviando..." : "Abrir Câmera / Upload"}
          </Button>
        </div>
      )}

      <PhotoDetailDialog
        foto={detailPhoto}
        categoriaNome={detailPhoto ? catName(detailPhoto.categoria_id) : ""}
        authorName={user?.full_name || user?.email}
        canDelete={detailPhoto ? detailPhoto.created_by_id === user?.id : false}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSave={handleSaveObs}
        onDelete={handleDeleteFoto}
        onDownload={handleDownloadFoto}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        obra={selectedObra}
        categorias={categorias}
        fotos={fotos}
        responsavel={user?.full_name || user?.email}
      />

      <NovaCategoriaDialog
        open={novaCatOpen}
        onOpenChange={setNovaCatOpen}
        obraId={obraId}
        onCreated={() => qc.invalidateQueries({ queryKey: ["categorias", obraId] })}
      />

      <LimitAlertDialog
        open={limitAlertOpen}
        onOpenChange={setLimitAlertOpen}
        plano={plano}
        usedMb={usedMb}
        limitMb={limitMb}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function CatPill({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-sm border label-mono text-[0.6875rem] transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {label}
      <span className={active ? "opacity-80" : "opacity-50"}>{count}</span>
    </button>
  );
}

function NovaCategoriaDialog({ open, onOpenChange, obraId, onCreated }) {
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Categoria.create({ obra_id: obraId, nome: nome.trim() });
      setNome("");
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-lg flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-primary" />
            Nova Categoria
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="catnome">Nome da categoria</Label>
            <Input
              id="catnome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Diárias, Evolução, Segurança..."
              className="bg-surface border-border"
              autoFocus
              required
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Criando..." : "Criar Categoria"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LimitAlertDialog({ open, onOpenChange, plano, usedMb, limitMb, isAdmin }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Limite de Armazenamento
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm pt-1">
            Você atingiu <span className="text-foreground font-medium">{Math.round(usedMb)} MB</span>{" "}
            de {Math.round(limitMb)} MB do seu plano{" "}
            <span className="text-primary font-medium">{planoNome(plano)}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-foreground">
          {isAdmin ? (
            <p>
              Como administrador, altere o plano do cliente no Painel Administrativo
              para liberar mais espaço.
            </p>
          ) : (
            <p>
              Novos uploads estão bloqueados. Entre em contato com o administrador para
              solicitar o upgrade de plano.
            </p>
          )}
        </div>
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
}