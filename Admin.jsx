import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StorageGauge from "@/components/StorageGauge";
import PhotoCard from "@/components/PhotoCard";
import {
  MobileSelect,
  MobileSelectTrigger,
  MobileSelectValue,
  MobileSelectContent,
  MobileSelectItem,
} from "@/components/MobileSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HardHat,
  LogOut,
  ArrowLeft,
  Users,
  ShieldAlert,
  ShieldCheck,
  Images,
  FolderTree,
  Building2,
  HardDrive,
} from "lucide-react";
import {
  perfilLabel,
  statusAssinaturaLabel,
  statusObraLabel,
  formatDate,
} from "@/lib/obraUtils";
import { PLANO_LIST, planoNome, planoLimitMb } from "@/lib/plans";

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [clientFilter, setClientFilter] = useState("all");

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
  });
  const obrasQ = useQuery({
    queryKey: ["obras-all"],
    queryFn: () => base44.entities.Obra.list("-created_date", 500),
  });
  const fotosQ = useQuery({
    queryKey: ["fotos-all-admin"],
    queryFn: () => base44.entities.Foto.list("-created_date", 1000),
  });

  const users = usersQ.data || [];
  const obras = obrasQ.data || [];
  const fotos = fotosQ.data || [];

  const clients = users.filter((u) => u.role !== "admin");
  const activeClients = clients.filter((u) => u.status_assinatura !== "SUSPENSO");
  const totalStorageKb = fotos.reduce((s, f) => s + (f.tamanho_kb || 0), 0);
  const totalStorageGb = totalStorageKb / (1024 * 1024);

  // storage per user
  const storageByUser = useMemo(() => {
    const map = {};
    for (const f of fotos) {
      const uid = f.created_by_id;
      if (!map[uid]) map[uid] = { kb: 0, count: 0 };
      map[uid].kb += f.tamanho_kb || 0;
      map[uid].count += 1;
    }
    return map;
  }, [fotos]);

  const obrasByUser = useMemo(() => {
    const map = {};
    for (const o of obras) {
      const uid = o.created_by_id;
      if (!map[uid]) map[uid] = 0;
      map[uid] += 1;
    }
    return map;
  }, [obras]);

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const previous = qc.getQueryData(["users"]);
      qc.setQueryData(["users"], (old = []) =>
        old.map((x) => (x.id === id ? { ...x, ...data } : x))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["users"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const toggleSuspend = (u) => {
    const next = u.status_assinatura === "SUSPENSO" ? "ATIVO" : "SUSPENSO";
    updateUserMutation.mutate({ id: u.id, data: { status_assinatura: next } });
  };

  const setPlan = (u, planoId) => {
    updateUserMutation.mutate({
      id: u.id,
      data: { plano: planoId, limite_storage_mb: planoLimitMb(planoId) },
    });
  };

  // filtered browse
  const filteredObras = useMemo(() => {
    if (clientFilter === "all") return obras;
    return obras.filter((o) => o.created_by_id === clientFilter);
  }, [obras, clientFilter]);

  const filteredFotos = useMemo(() => {
    if (clientFilter === "all") return fotos;
    return fotos.filter((f) => f.created_by_id === clientFilter);
  }, [fotos, clientFilter]);

  const userName = (uid) => {
    const u = users.find((x) => x.id === uid);
    return u?.full_name || u?.email || "—";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 safe-top">
        <div className="flex items-center gap-3 px-5 h-14">
          <div className="w-8 h-8 rounded-sm bg-primary/15 border border-primary/40 flex items-center justify-center">
            <HardHat className="w-4 h-4 text-primary" />
          </div>
          <div className="font-display font-bold tracking-wide text-sm">
            OBRA<span className="text-primary">FOTO</span>
            <span className="text-muted-foreground label-mono text-[0.625rem] ml-2">
              ADMIN
            </span>
          </div>
          <div className="flex-1" />
          <Link
            to="/"
            aria-label="Voltar ao app"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 h-10 rounded-sm border border-border hover:border-primary/40 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="border-border text-muted-foreground h-10"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 bg-blueprint px-5 lg:px-8 py-6 overflow-y-auto">
        {/* Title */}
        <div className="mb-6">
          <h1
            className="font-display font-bold tracking-wide leading-none"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
          >
            Painel do Administrador
          </h1>
          <p className="label-mono text-[0.6875rem] text-muted-foreground mt-2">
            {clients.length} clientes · {obras.length} obras · {fotos.length} fotos
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MetricCard
            icon={<Users className="w-5 h-5 text-primary" />}
            label="Clientes Ativos"
            value={activeClients.length}
            sub={`${clients.length} cadastrados`}
          />
          <MetricCard
            icon={<Building2 className="w-5 h-5 text-primary" />}
            label="Obras Cadastradas"
            value={obras.length}
            sub={`${obras.filter((o) => o.status === "EM_ANDAMENTO").length} em andamento`}
          />
          <MetricCard
            icon={<HardDrive className="w-5 h-5 text-primary" />}
            label="Armazenamento Utilizado"
            value={
              totalStorageGb >= 1
                ? `${totalStorageGb.toFixed(2)} GB`
                : `${Math.round(totalStorageKb / 1024)} MB`
            }
            sub={`${fotos.length} fotos`}
          />
        </div>

        {/* Clients table */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold tracking-wide uppercase text-sm">
              Clientes
            </h2>
          </div>
          <div className="rounded-md border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/60">
                  <th className="text-left label-mono text-[0.625rem] text-muted-foreground font-medium px-4 py-3">
                    Cliente
                  </th>
                  <th className="text-left label-mono text-[0.625rem] text-muted-foreground font-medium px-4 py-3 min-w-[150px]">
                    Plano
                  </th>
                  <th className="text-left label-mono text-[0.625rem] text-muted-foreground font-medium px-4 py-3">
                    Status
                  </th>
                  <th className="text-left label-mono text-[0.625rem] text-muted-foreground font-medium px-4 py-3">
                    Obras
                  </th>
                  <th className="text-left label-mono text-[0.625rem] text-muted-foreground font-medium px-4 py-3">
                    Fotos
                  </th>
                  <th className="text-left label-mono text-[0.625rem] text-muted-foreground font-medium px-4 py-3 min-w-[180px]">
                    Armazenamento
                  </th>
                  <th className="text-right label-mono text-[0.625rem] text-muted-foreground font-medium px-4 py-3">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </td>
                  </tr>
                )}
                {clients.map((u) => {
                  const s = storageByUser[u.id] || { kb: 0, count: 0 };
                  const usedMb = s.kb / 1024;
                  const limitMb = planoLimitMb(u.plano);
                  return (
                    <ClientRow
                      key={u.id}
                      u={u}
                      usedMb={usedMb}
                      limitMb={limitMb}
                      fotosCount={s.count}
                      obrasCount={obrasByUser[u.id] || 0}
                      onToggle={() => toggleSuspend(u)}
                      onSetPlan={(p) => setPlan(u, p)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Global browse by client */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="font-display font-bold tracking-wide uppercase text-sm">
                Obras & Fotos
              </h2>
            </div>
            <div className="sm:ml-auto w-full sm:w-64">
              <MobileSelect value={clientFilter} onValueChange={setClientFilter} title="Filtrar por cliente">
                <MobileSelectTrigger className="bg-surface border-border h-10">
                  <MobileSelectValue placeholder="Filtrar por cliente" />
                </MobileSelectTrigger>
                <MobileSelectContent className="bg-popover border-border">
                  <MobileSelectItem value="all">Todos os clientes</MobileSelectItem>
                  {clients.map((c) => (
                    <MobileSelectItem key={c.id} value={c.id}>
                      {c.full_name || c.email}
                    </MobileSelectItem>
                  ))}
                </MobileSelectContent>
              </MobileSelect>
            </div>
          </div>

          {filteredObras.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Nenhuma obra encontrada.
            </div>
          ) : (
            <div className="space-y-5">
              {filteredObras.map((o) => {
                const ofotos = filteredFotos.filter((f) => f.obra_id === o.id);
                return (
                  <div key={o.id} className="rounded-md border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-display font-bold tracking-wide text-base truncate">
                          {o.nome_obra}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border label-mono text-[0.625rem] ${
                              o.status === "CONCLUIDA"
                                ? "bg-success/15 border-success/40 text-success"
                                : "bg-primary/15 border-primary/40 text-primary"
                            }`}
                          >
                            {statusObraLabel(o.status)}
                          </span>
                          <span className="label-mono text-[0.625rem] text-muted-foreground">
                            {formatDate(o.data_inicio)}
                          </span>
                          <span className="label-mono text-[0.625rem] text-muted-foreground">
                            · {userName(o.created_by_id)}
                          </span>
                        </div>
                      </div>
                      <div className="sm:ml-auto flex items-center gap-1.5 label-mono text-[0.6875rem] text-muted-foreground">
                        <Images className="w-3.5 h-3.5" />
                        {ofotos.length} fotos
                      </div>
                    </div>
                    {ofotos.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 label-mono py-2">
                        Sem fotos registradas.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2">
                        {ofotos.slice(0, 12).map((f) => (
                          <PhotoCard
                            key={f.id}
                            foto={f}
                            categoriaNome=""
                            onClick={() => {}}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 flex items-start gap-4">
      <div className="w-11 h-11 rounded-sm bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="label-mono text-[0.625rem] text-muted-foreground">{label}</div>
        <div className="font-display font-bold text-foreground leading-none mt-1.5"
          style={{ fontSize: "clamp(1.5rem, 2vw, 2rem)" }}>
          {value}
        </div>
        {sub && (
          <div className="label-mono text-[0.625rem] text-muted-foreground/70 mt-1.5">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientRow({ u, usedMb, limitMb, fotosCount, obrasCount, onToggle, onSetPlan }) {
  const suspended = u.status_assinatura === "SUSPENSO";
  const plano = u.plano || "BASICO";

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-surface/40">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{u.full_name || "Sem nome"}</div>
        <div className="text-xs text-muted-foreground">{u.email}</div>
      </td>
      <td className="px-4 py-3 min-w-[150px]">
        <MobileSelect value={plano} onValueChange={(p) => onSetPlan(p)} title="Alterar plano">
          <MobileSelectTrigger className="bg-surface border-border h-10 text-xs">
            <MobileSelectValue />
          </MobileSelectTrigger>
          <MobileSelectContent className="bg-popover border-border">
            {PLANO_LIST.map((p) => (
              <MobileSelectItem key={p.id} value={p.id}>
                {`${p.nome} · ${p.limiteMb >= 1024 ? `${p.limiteMb / 1024} GB` : `${p.limiteMb} MB`}`}
              </MobileSelectItem>
            ))}
          </MobileSelectContent>
        </MobileSelect>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border label-mono text-[0.625rem] ${
            suspended
              ? "bg-destructive/15 border-destructive/40 text-destructive"
              : "bg-success/15 border-success/40 text-success"
          }`}
        >
          {suspended ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
          {statusAssinaturaLabel(u.status_assinatura)}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{obrasCount}</td>
      <td className="px-4 py-3 text-muted-foreground">{fotosCount}</td>
      <td className="px-4 py-3 min-w-[180px]">
        <div className="w-44">
          <StorageGauge usedMb={usedMb} limitMb={limitMb} />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={onToggle}
          className={`h-10 px-3 text-xs border ${
            suspended
              ? "border-success/40 text-success hover:bg-success/10"
              : "border-destructive/40 text-destructive hover:bg-destructive/10"
          }`}
        >
          {suspended ? "Ativar" : "Suspender"}
        </Button>
      </td>
    </tr>
  );
}