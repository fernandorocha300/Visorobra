import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobilePageHeader from "@/components/MobilePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { statusObraLabel } from "@/lib/obraUtils";
import {
  Building2,
  MapPin,
  CalendarDays,
  Images,
  Pencil,
  Archive,
  ArchiveRestore,
  Plus,
} from "lucide-react";

export default function Obras() {
  const ctx = useOutletContext();
  const { obras, openNovaObra, isAdmin } = ctx;
  const qc = useQueryClient();

  const fotosQ = useQuery({
    queryKey: ["fotos-all"],
    queryFn: () => base44.entities.Foto.list("-created_date", 1000),
  });
  const fotos = fotosQ.data || [];

  const [editObra, setEditObra] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const countFotos = (obraId) =>
    fotos.filter((f) => f.obra_id === obraId).length;

  const archiveMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Obra.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["obras"] });
      const previous = qc.getQueryData(["obras"]);
      qc.setQueryData(["obras"], (old = []) =>
        old.map((o) => (o.id === id ? { ...o, status } : o))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["obras"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["obras"] }),
  });

  const handleArchive = (obra) => {
    const novo = obra.status === "CONCLUIDA" ? "EM_ANDAMENTO" : "CONCLUIDA";
    archiveMutation.mutate({ id: obra.id, status: novo });
  };

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-6">
      <MobilePageHeader />
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1
            className="font-display font-bold tracking-wide leading-none mb-1"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
          >
            Obras
          </h1>
          <p className="label-mono text-[0.6875rem] text-muted-foreground">
            {obras.length} obras cadastradas
          </p>
        </div>
        <Button
          onClick={openNovaObra}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Obra
        </Button>
      </div>

      {obras.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 flex flex-col items-center justify-center gap-3 text-center">
          <Building2 className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Nenhuma obra cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {obras.map((o) => {
            const arquivada = o.status === "CONCLUIDA";
            return (
              <div
                key={o.id}
                className={`rounded-md border bg-card p-4 flex flex-col gap-3 ${
                  arquivada ? "border-border opacity-70" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-foreground truncate">
                      {o.nome_obra}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border label-mono text-[0.625rem] mt-1.5 ${
                        arquivada
                          ? "border-border bg-surface text-muted-foreground"
                          : "border-primary/40 bg-primary/10 text-primary"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {statusObraLabel(o.status)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 border-border"
                      onClick={() => {
                        setEditObra(o);
                        setEditOpen(true);
                      }}
                      title="Editar obra"
                      aria-label="Editar obra"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {o.endereco && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{o.endereco}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    <span>Início: {o.data_inicio || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Images className="w-3.5 h-3.5 shrink-0" />
                    <span>{countFotos(o.id)} fotos</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(o)}
                  className={`w-full mt-1 border-border h-10 ${
                    arquivada
                      ? "text-primary hover:bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {arquivada ? (
                    <>
                      <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />
                      Reativar Obra
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5 mr-1.5" />
                      Arquivar (Concluir)
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <EditObraDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        obra={editObra}
        onSaved={() => qc.invalidateQueries({ queryKey: ["obras"] })}
      />
    </div>
  );
}

function EditObraDialog({ open, onOpenChange, obra, onSaved }) {
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  React.useEffect(() => {
    if (obra) {
      setNome(obra.nome_obra || "");
      setEndereco(obra.endereco || "");
      setDataInicio(obra.data_inicio || "");
      setErr("");
    }
  }, [obra]);

  const submit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    setErr("");
    try {
      await base44.entities.Obra.update(obra.id, {
        nome_obra: nome.trim(),
        endereco: endereco.trim(),
        data_inicio: dataInicio,
      });
      onOpenChange(false);
      onSaved();
    } catch (e2) {
      setErr(e2.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-lg flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Editar Obra
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 px-1">
          {err && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-sm">
              {err}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="enome">Nome da obra *</Label>
            <Input
              id="enome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-surface border-border"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eend">Endereço</Label>
            <Input
              id="eend"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="bg-surface border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edi">Data de início *</Label>
            <Input
              id="edi"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-surface border-border"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}