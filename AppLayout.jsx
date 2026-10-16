import React, { useState, useMemo, useEffect, useRef } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import BottomTabBar from "@/components/BottomTabBar";
import PullToRefresh from "@/components/PullToRefresh";
import AnimatedOutlet from "@/components/AnimatedOutlet";
import useTabScrollRestoration from "@/hooks/useTabScrollRestoration";
import {
  MobileSelect,
  MobileSelectTrigger,
  MobileSelectValue,
  MobileSelectContent,
  MobileSelectItem,
} from "@/components/MobileSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import StorageGauge from "@/components/StorageGauge";
import { perfilLabel } from "@/lib/obraUtils";
import { planoLimitMb } from "@/lib/plans";
import {
  HardHat,
  Plus,
  LogOut,
  ShieldCheck,
  HardDrive,
  X,
  Settings,
  Home as HomeIcon,
  Building2,
  FileText,
  User as UserIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const isClient = !isAdmin;

  const [selectedObraId, setSelectedObraId] = useState(
    () => localStorage.getItem("obraSel") || ""
  );
  const [novaObraOpen, setNovaObraOpen] = useState(false);
  const mainRef = useRef(null);
  useTabScrollRestoration(mainRef);

  const obrasQ = useQuery({
    queryKey: ["obras"],
    queryFn: () => base44.entities.Obra.list("-created_date", 200),
  });

  const fotosQ = useQuery({
    queryKey: ["fotos-all"],
    queryFn: () => base44.entities.Foto.list("-created_date", 1000),
    enabled: isClient,
  });

  const obras = obrasQ.data || [];

  // auto-select first obra if none chosen
  useEffect(() => {
    if ((!selectedObraId || selectedObraId === "") && obras.length > 0) {
      setSelectedObraId(obras[0].id);
      localStorage.setItem("obraSel", obras[0].id);
    }
  }, [obras, selectedObraId]);

  const selectedObra = obras.find((o) => o.id === selectedObraId) || null;

  const usedMb = useMemo(() => {
    const fotos = fotosQ.data || [];
    const kb = fotos.reduce((s, f) => s + (f.tamanho_kb || 0), 0);
    return kb / 1024;
  }, [fotosQ.data]);

  const limitMb = planoLimitMb(user?.plano);
  const suspended = user?.status_assinatura === "SUSPENSO";

  const refreshStorage = () => qc.invalidateQueries({ queryKey: ["fotos-all"] });
  const refreshObras = () => qc.invalidateQueries({ queryKey: ["obras"] });

  const handleSelect = (val) => {
    setSelectedObraId(val);
    localStorage.setItem("obraSel", val);
  };

  const handleLogout = () => logout();

  const rail = (
    <div className="flex flex-col gap-5 p-4 h-full">
      {/* Logo mark */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-9 h-9 rounded-sm bg-primary/15 border border-primary/40 flex items-center justify-center">
          <HardHat className="w-5 h-5 text-primary" />
        </div>
        <div className="leading-none">
          <div className="font-display font-bold text-base tracking-wide text-foreground">
            OBRA<span className="text-primary">FOTO</span>
          </div>
          <div className="label-mono text-[0.5625rem] text-muted-foreground mt-0.5">
            Gestão de Campo
          </div>
        </div>
      </div>

      {/* Site picker */}
      <div className="space-y-2">
        <label className="label-mono text-[0.625rem] text-muted-foreground px-1">
          Obra Atual
        </label>
        <div className="flex gap-2">
          <MobileSelect value={selectedObraId || ""} onValueChange={handleSelect} title="Selecionar obra">
            <MobileSelectTrigger className="flex-1 bg-surface border-border h-10">
              <MobileSelectValue placeholder="Selecionar obra..." />
            </MobileSelectTrigger>
            <MobileSelectContent className="bg-popover border-border">
              {obras.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Nenhuma obra cadastrada
                </div>
              )}
              {obras.map((o) => (
                <MobileSelectItem key={o.id} value={o.id} className="text-foreground">
                  {o.nome_obra}
                </MobileSelectItem>
              ))}
            </MobileSelectContent>
          </MobileSelect>
          <Button
            type="button"
            size="icon"
            onClick={() => setNovaObraOpen(true)}
            className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
            title="Nova obra"
            aria-label="Nova obra"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Storage gauge (client only) */}
      {isClient && (
        <div className="rounded-md border border-border bg-card p-3">
          <StorageGauge usedMb={usedMb} limitMb={limitMb} />
          {suspended && (
            <p className="mt-2 text-[0.6875rem] text-destructive label-mono">
              Conta suspensa
            </p>
          )}
        </div>
      )}

      {/* Admin link */}
      {isAdmin && (
        <Link
          to="/admin"
          className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm hover:border-primary/60 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="font-display font-bold tracking-wide">
            Painel Admin
          </span>
        </Link>
      )}

      {/* Navigation */}
      <div className="space-y-1">
        <label className="label-mono text-[0.625rem] text-muted-foreground px-1">
          Navegação
        </label>
        <RailLink to="/" icon={<HomeIcon className="w-4 h-4" />} label="Início" />
        <RailLink to="/obras" icon={<Building2 className="w-4 h-4" />} label="Obras" />
        <RailLink to="/relatorios" icon={<FileText className="w-4 h-4" />} label="Relatórios" />
        <RailLink to="/perfil" icon={<UserIcon className="w-4 h-4" />} label="Perfil" />
        <RailLink to="/configuracoes" icon={<Settings className="w-4 h-4" />} label="Configurações" />
      </div>

      <div className="flex-1" />

      {/* User badge */}
      <div className="rounded-md border border-border bg-card p-3 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center label-mono text-[0.6875rem] text-primary">
            {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="label-mono text-[0.625rem] text-muted-foreground">
              {perfilLabel(user?.role)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full border-border text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-background">
      {!isMobile && (
        <aside className="w-[260px] shrink-0 border-r border-border bg-surface/40 flex flex-col">
          {rail}
        </aside>
      )}

      {isMobile && (
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur safe-top">
          <div className="flex items-center gap-2 px-3 h-14">
            <div className="w-8 h-8 rounded-sm bg-primary/15 border border-primary/40 flex items-center justify-center shrink-0">
              <HardHat className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <MobileSelect value={selectedObraId || ""} onValueChange={handleSelect} title="Selecionar obra">
                <MobileSelectTrigger className="bg-background border-border h-10">
                  <MobileSelectValue placeholder="Selecionar obra..." />
                </MobileSelectTrigger>
                <MobileSelectContent className="bg-popover border-border">
                  {obras.map((o) => (
                    <MobileSelectItem key={o.id} value={o.id}>
                      {o.nome_obra}
                    </MobileSelectItem>
                  ))}
                </MobileSelectContent>
              </MobileSelect>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
              <HardDrive className="w-4 h-4" />
              <span className="label-mono text-[0.625rem]">
                {Math.round(usedMb)}/{Math.round(limitMb)}
              </span>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="ml-1 inline-flex items-center justify-center w-10 h-10 rounded-sm border border-border text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
                  title="Painel do Administrador"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      <main
        ref={mainRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden bg-blueprint ${isMobile ? "pb-[calc(60px+env(safe-area-inset-bottom))]" : ""}`}
        style={{ overscrollBehavior: "none" }}
      >
        <PullToRefresh
          scrollRef={mainRef}
          queryKeys={[
            ["obras"],
            ["fotos-all"],
            ["fotos"],
            ["categorias"],
            ["relatorios"],
          ]}
        >
          <AnimatedOutlet
            context={{
              selectedObra,
              obras,
              refreshObras,
              refreshStorage,
              usedMb,
              limitMb,
              suspended,
              user,
              isAdmin,
              isMobile,
              openNovaObra: () => setNovaObraOpen(true),
            }}
          />
        </PullToRefresh>
      </main>

      {isMobile && <BottomTabBar />}

      <NovaObraDialog
        open={novaObraOpen}
        onOpenChange={setNovaObraOpen}
        onCreated={(id) => {
          refreshObras();
          if (id) handleSelect(id);
        }}
      />
    </div>
  );
}

function RailLink({ to, icon, label }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-primary/15 border border-primary/40 text-primary"
          : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-card"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function NovaObraDialog({ open, onOpenChange, onCreated }) {
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const obra = await base44.entities.Obra.create({
        nome_obra: nome.trim(),
        endereco: endereco.trim(),
        data_inicio: dataInicio,
        status: "EM_ANDAMENTO",
      });
      setNome("");
      setEndereco("");
      onOpenChange(false);
      onCreated(obra.id);
    } catch (e2) {
      setErr(e2.message || "Erro ao criar obra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-lg flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Nova Obra
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 px-1">
          {err && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-sm">
              {err}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da obra *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-surface border-border"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Endereço</Label>
            <Input
              id="end"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="bg-surface border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="di">Data de início *</Label>
            <Input
              id="di"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-surface border-border"
              required
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Criando..." : "Criar Obra"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}