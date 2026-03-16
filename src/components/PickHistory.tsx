import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePickBalance } from "@/hooks/usePickBalance";
import { Loader2, Coins, Plus, Trash2, ShoppingBag, Gift } from "lucide-react";

interface HistoryEntry {
  id: string;
  type: "purchase" | "pick_created" | "pick_deleted" | "referral";
  label: string;
  detail?: string;
  date: string;
  timestamp: number;
}

const PickHistory = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { balance } = usePickBalance();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      const results: HistoryEntry[] = [];

      // Fetch purchases
      const { data: purchases } = await supabase
        .from("pack_purchases")
        .select("id, pack_name, picks_count, price, payment_method, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (purchases) {
        for (const p of purchases) {
          const isReferral = p.payment_method === 'referral';
          results.push({
            id: `purchase-${p.id}`,
            type: isReferral ? "referral" : "purchase",
            label: p.pack_name,
            detail: isReferral 
              ? `+${p.picks_count} ${t("packs.creditsUnit")} 🎁`
              : `+${p.picks_count} ${t("packs.creditsUnit")} · ${p.price}€`,
            date: p.created_at,
            timestamp: new Date(p.created_at).getTime(),
          });
        }
      }

      // Fetch picks (created and deleted)
      const { data: picks } = await supabase
        .from("picks")
        .select("id, picked_name, created_at, deleted_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (picks) {
        for (const pick of picks) {
          results.push({
            id: `created-${pick.id}`,
            type: "pick_created",
            label: pick.picked_name,
            date: pick.created_at,
            timestamp: new Date(pick.created_at).getTime(),
          });

          if (pick.deleted_at) {
            results.push({
              id: `deleted-${pick.id}`,
              type: "pick_deleted",
              label: pick.picked_name,
              date: pick.deleted_at,
              timestamp: new Date(pick.deleted_at).getTime(),
            });
          }
        }
      }

      results.sort((a, b) => b.timestamp - a.timestamp);
      setEntries(results);
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const iconMap = {
    purchase: <ShoppingBag className="w-4 h-4 text-green-500" />,
    referral: <Gift className="w-4 h-4 text-amber-500" />,
    pick_created: <Plus className="w-4 h-4 text-primary" />,
    pick_deleted: <Trash2 className="w-4 h-4 text-destructive" />,
  };

  const labelMap = {
    purchase: t("history.purchase", "Compra"),
    referral: t("history.referral", "Código promocional"),
    pick_created: t("history.pickCreated", "Pick enviado"),
    pick_deleted: t("history.pickDeleted", "Pick eliminado"),
  };

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-medium text-foreground">
            {t("history.balance", "Saldo actual")}
          </span>
        </div>
        <span className="text-lg font-bold text-foreground">
          {balance?.picks_remaining ?? 0}
        </span>
      </div>

      {/* Stats row */}
      {balance && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("history.totalPurchased", "Comprados")}</p>
            <p className="text-lg font-semibold text-foreground">{balance.total_purchased}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("history.totalUsed", "Usados")}</p>
            <p className="text-lg font-semibold text-foreground">{balance.total_used}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t("history.timeline", "Historial")}
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("history.empty", "Sin actividad todavía")}
          </p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  {iconMap[entry.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{labelMap[entry.type]}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{entry.label}</p>
                  {entry.detail && (
                    <p className="text-xs text-green-600">{entry.detail}</p>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                  {formatDate(entry.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PickHistory;
