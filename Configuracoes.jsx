import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import MobilePageHeader from "@/components/MobilePageHeader";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MobileSelect,
  MobileSelectTrigger,
  MobileSelectValue,
  MobileSelectContent,
  MobileSelectItem,
} from "@/components/MobileSelect";
import {
  Bell,
  LayoutGrid,
  ShieldAlert,
  Save,
  CheckCircle2,
} from "lucide-react";

export default function Configuracoes() {
  const ctx = useOutletContext();
  const { user } = ctx;
  const { checkUserAuth } = useAuth();

  const [notif, setNotif] = useState(true);
  const [densidade, setDensidade] = useState("NORMAL");
  const [confirmDel, setConfirmDel] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setNotif(user?.notificacoes_email !== false);
    setDensidade(user?.densidade || "NORMAL");
    setConfirmDel(user?.confirmar_exclusao !== false);
  }, [user]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await base44.auth.updateMe({
        notificacoes_email: notif,
        densidade,
        confirmar_exclusao: confirmDel,
      });
      await checkUserAuth();
      setMsg("Preferências salvas.");
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
        Configurações
      </h1>
      <p className="label-mono text-[0.6875rem] text-muted-foreground mb-6">
        Gerencie suas preferências do aplicativo
      </p>

      {/* Notifications */}
      <div className="rounded-md border border-border bg-card p-5 mb-4">
        <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Notificações
        </h2>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              Notificações por email
            </p>
            <p className="text-[0.75rem] text-muted-foreground">
              Receber avisos sobre uploads, sincronização e limites de
              armazenamento.
            </p>
          </div>
          <Switch checked={notif} onCheckedChange={setNotif} />
        </div>
      </div>

      {/* Display mode */}
      <div className="rounded-md border border-border bg-card p-5 mb-4">
        <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          Modo de Exibição
        </h2>
        <div className="space-y-2">
          <Label className="label-mono text-[0.6875rem] text-muted-foreground">
            Densidade da interface
          </Label>
          <MobileSelect value={densidade} onValueChange={setDensidade} title="Densidade da interface">
            <MobileSelectTrigger className="bg-surface border-border">
              <MobileSelectValue />
            </MobileSelectTrigger>
            <MobileSelectContent className="bg-popover border-border">
              <MobileSelectItem value="NORMAL">Normal</MobileSelectItem>
              <MobileSelectItem value="COMPACTA">Compacta</MobileSelectItem>
            </MobileSelectContent>
          </MobileSelect>
          <p className="text-[0.75rem] text-muted-foreground">
            Compacta reduz o espaçamento para caber mais conteúdo na tela.
          </p>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-md border border-border bg-card p-5 mb-5">
        <h2 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" />
          Preferências
        </h2>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              Confirmar antes de excluir
            </p>
            <p className="text-[0.75rem] text-muted-foreground">
              Exibir diálogo de confirmação ao excluir fotos e relatórios.
            </p>
          </div>
          <Switch checked={confirmDel} onCheckedChange={setConfirmDel} />
        </div>
      </div>

      {msg && (
        <p className="text-sm text-success flex items-center gap-1.5 mb-4">
          <CheckCircle2 className="w-4 h-4" />
          {msg}
        </p>
      )}

      <Button
        onClick={save}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-10"
      >
        <Save className="w-4 h-4 mr-1.5" />
        {saving ? "Salvando..." : "Salvar Preferências"}
      </Button>

      <DeleteAccountSection user={user} />
    </div>
  );
}