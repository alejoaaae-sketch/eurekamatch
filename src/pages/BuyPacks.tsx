import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Package, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePickBalance, PickPack } from "@/hooks/usePickBalance";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BuyPacks = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { packs, picksRemaining, purchasePack, loading: balanceLoading } = usePickBalance();
  const [selectedPack, setSelectedPack] = useState<PickPack | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (authLoading || balanceLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelectPack = (pack: PickPack) => {
    setSelectedPack(pack);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async () => {
    if (!selectedPack) return;
    setShowPaymentModal(false);
    setProcessing(true);

    const result = await purchasePack(selectedPack);
    setProcessing(false);

    if (result.success) {
      toast.success(t("packs.purchaseSuccess", { count: selectedPack.picks_count }));
      navigate("/home");
    } else {
      toast.error(result.error || t("common.error"));
    }
  };

  const packLabels: Record<string, { label: string; icon: string }> = {
    basic: { label: t("packs.basic"), icon: "📦" },
    small: { label: t("packs.small"), icon: "🎁" },
    medium: { label: t("packs.medium"), icon: "⭐" },
    large: { label: t("packs.large"), icon: "💎" },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t("packs.title")}</h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-8">
        {/* Balance display */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-1">{t("packs.currentBalance")}</p>
          <p className="text-3xl font-bold text-foreground">
            {picksRemaining} <span className="text-base font-normal text-muted-foreground">{t("packs.creditsUnit")}</span>
          </p>
        </div>

        {/* Packs grid */}
        <div className="space-y-3">
          {packs.map((pack) => {
            const meta = packLabels[pack.name] || { label: pack.name, icon: "📦" };
            const isPopular = pack.name === "medium";

            return (
              <button
                key={pack.id}
                onClick={() => handleSelectPack(pack)}
                disabled={processing}
                className={`w-full relative rounded-2xl border-2 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isPopular
                    ? "border-primary bg-primary/5"
                    : "border-border/50 bg-secondary/30 hover:border-border"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {t("packs.popular")}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.icon}</span>
                    <div>
                      <p className="font-semibold text-foreground">{meta.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {pack.picks_count} {t("packs.creditsUnit")} · {Number(pack.price_per_pick).toFixed(2).replace('.', ',')} €/{t("packs.creditsUnit").slice(0, -1)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">{Number(pack.price).toFixed(0)} €</p>
                    {pack.savings_percent > 0 && (
                      <p className="text-xs font-medium text-primary">
                        -{pack.savings_percent}%
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 {t("packs.info")}
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentSimulationModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        onPaymentComplete={handlePaymentComplete}
        action="add"
        amount={selectedPack ? Number(selectedPack.price) : 0}
      />
    </div>
  );
};

export default BuyPacks;
