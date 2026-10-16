import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function DeleteAccountSection({ user }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  const confirmed = text === "DELETE";

  const handleDelete = async () => {
    if (!confirmed || !user?.id) return;
    setDeleting(true);
    setErr("");
    try {
      await base44.entities.User.delete(user.id);
      logout();
    } catch (e) {
      setErr(e.message || "Não foi possível excluir a conta.");
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-5 mt-8">
      <h2 className="font-display font-bold text-base mb-2 flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-4 h-4" />
        Zona de Perigo
      </h2>
      <p className="text-[0.75rem] text-muted-foreground mb-4">
        Excluir sua conta remove permanentemente todos os seus dados. Esta ação
        não pode ser desfeita.
      </p>
      <Button
        onClick={() => {
          setText("");
          setErr("");
          setOpen(true);
        }}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10"
      >
        <Trash2 className="w-4 h-4 mr-1.5" />
        Excluir Conta
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Excluir conta permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Todas as suas obras, fotos, relatórios e dados serão excluídos
              permanentemente e não poderão ser recuperados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              Digite <span className="font-bold text-destructive">DELETE</span>{" "}
              para confirmar:
            </p>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="DELETE"
              className="bg-surface border-border h-10"
              autoComplete="off"
            />
            {err && <p className="text-sm text-destructive">{err}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-border h-10">
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={!confirmed || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10"
            >
              {deleting ? "Excluindo..." : "Excluir Conta"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}