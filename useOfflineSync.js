import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getAllPending, countPending, removePending } from "@/lib/offlineQueue";

// Tracks online/offline status, exposes the pending photo count, and
// auto-syncs the offline queue (upload + create Foto) whenever the
// connection comes back.
export function useOfflineSync({ onSynced } = {}) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      setPendingCount(await countPending());
    } catch {
      /* ignore */
    }
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const items = await getAllPending();
      for (const item of items) {
        try {
          const { file_url } = await base44.integrations.Core.UploadPublicFile({
            file: item.blob,
          });
          await base44.entities.Foto.create({
            categoria_id: item.categoria_id,
            obra_id: item.obra_id,
            url_imagem: file_url,
            url_thumbnail: file_url,
            tamanho_kb: item.tamanho_kb,
            data_registro: item.data_registro,
          });
          await removePending(item.id);
        } catch (e) {
          // likely still offline mid-sync — stop and retry later
          console.warn("sync item failed", e);
          break;
        }
      }
      await refreshCount();
      onSynced?.();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshCount, onSynced]);

  useEffect(() => {
    refreshCount();
    const goOnline = () => {
      setIsOnline(true);
      sync();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshCount, sync]);

  return { isOnline, pendingCount, syncing, sync, refreshCount };
}