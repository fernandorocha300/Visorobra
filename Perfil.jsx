import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import MobilePageHeader from "@/components/MobilePageHeader";
import StorageGauge from "@/components/StorageGauge";
import { planoNome } from "@/lib/plans";
import { perfilLabel, statusAssinaturaLabel } from "@/lib/obraUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Mail, Save, HardDrive, Crown, CheckCircle2 } from "lucide-react";

export default function Perfil() {
  const ctx = useOutletContext();
  const { user, usedMb = 0, limitMb = 5120 } = ctx;
  const { checkUserAuth } = useAuth();

  const [nome, setNome] = useState(user?.nome_perfil || user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const plano = user?.plano || "BASICO";
  const suspended = user?.status_assinatura === "SUSPENSO";

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await base44.auth.updateMe({ nome_perfil: nome.trim() });
      await checkUserAuth();
      setMsg("Perfil atualizado.");
    } catch (err) {
      setMsg(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 lg:px-8 py-6">
      <MobilePageHeader />
      <h1
        className="font-display font-bold tracking-wide leading-none mb-1"
        style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
      >
        Perfil
      </h1>
      <p className="label-mono text-[0.6875rem] text-muted-foreground mb-6">
        Suas informações de conta e uso do plano
      </p>

      {/* Avatar + identity */}
      <div className="rounded-md border border-border bg-card p-5 mb-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center font-display font-bold text-2xl text-primary shrink-0">
          {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-lg text-foreground truncate">
            {user?.nome_perfil || user?.full_name || "—"}
          </p>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-primary/40 bg-primary/10 text-primary label-mono text-[0.625rem]">
              {perfilLabel(user?.role)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-border bg-surface text-muted-foreground label-mono text-[0.625rem]">
              {planoNome(plano)}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border label-mono text-[0.625rem] ${
                suspended
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-success/40 bg-success/10 text-success"
              }`}
            >
              {statusAssinaturaLabel(user?.status_assinatura)}
            </span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-md border border-border bg-card p-5 mb-5">
        <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-primary" />
          Editar Nome
        </h2>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="label-mono text-[0.6875rem]">
              Nome de exibição
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-surface border-border"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label className="label-mono text-[0.6875rem] text-muted-foreground">
              Email
            </Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface/60">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">
                {user?.email}
              </span>
            </div>
            <p className="text-[0.6875rem] text-muted-foreground/70">
              O email é gerenciado pela conta e não pode ser alterado aqui.
            </p>
          </div>
          {msg && (
            <p className="text-sm text-success flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {msg}
            </p>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </div>

      {/* Storage usage */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          Uso do Armazenamento
        </h2>
        <StorageGauge usedMb={usedMb} limitMb={limitMb} />
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Crown className="w-4 h-4 text-primary" />
          Plano atual: <span className="text-foreground font-medium">{planoNome(plano)}</span>
        </div>
      </div>
    </div>
  );
}