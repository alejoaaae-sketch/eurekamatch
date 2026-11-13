import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Package, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePickBalance, PickPack } from "@/hooks/usePickBalance";
import { useAppConfig } from "@/hooks/useAppConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentSimulationModal from "@/components/PaymentSimulationModal";
import CardPaymentForm from "@/components/CardPaymentForm";
import { useAdmin } from "@/hooks/useAdmin";
import { canUseRealPaymentTrial } from '@/lib/payment-trial';
import { FunctionsHttpError } from '@supabase/supabase-js';

const BuyPacks = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { packs, picksRemaining, loading: balanceLoading, refetch: refetchBalance } = usePickBalance();
  
  const { betaMode, loading: configLoading } = useAppConfig();
  const [processing, setProcessing] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PickPack | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);

  if (authLoading || balanceLoading || configLoading || adminLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelectPack = async (pack: PickPack) => {
    if (canUseRealPaymentTrial(user.id, isAdmin)) {
      if (processing) return;
      setProcessing(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { packId: pack.id, returnOrigin: window.location.origin },
        });
        if (error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
        const destination = new URL(data.url);
        if (destination.origin !== 'https://checkout.stripe.com') throw new Error('Destino de pago no válido');
        window.location.assign(destination.href);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo abrir Stripe');
        setProcessing(false);
      }
      return;
    }
    if (betaMode) {
      if (!isAdmin) return;
      setSelectedPack(pack);
      setShowSimulation(true);
      return;
    }

    // Real payment: show embedded card form
    setSelectedPack(pack);
    setShowCardForm(true);
  };

  const handleCardSuccess = (picksAdded: number) => {
    setShowCardForm(false);
    setSelectedPack(null);
    refetchBalance();
    toast.success(t("packs.purchaseSuccess", { count: picksAdded }));
  };

  const handleCardError = (msg: string) => {
    toast.error(msg || t("common.error"));
  };

  const handleCardCancel = () => {
    setShowCardForm(false);
    setSelectedPack(null);
  };

  const handleBetaPaymentComplete = async () => {
    if (!selectedPack || !user || !isAdmin) return;
    try {
      // Server-side RPC enforces the administrator role and beta flag.
      const { error } = await supabase.rpc('complete_beta_purchase', { p_pack_id: selectedPack.id });
      if (error) throw error;

      refetchBalance();
      toast.success(t("payment.success"));
    } catch (err) {
      console.error('Beta purchase error:', err);
      toast.error(t("common.error"));
    }
    setShowSimulation(false);
    setSelectedPack(null);
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
        {showCardForm && selectedPack ? (
          /* Embedded card payment form */
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-6">
              <p className="text-lg font-semibold text-foreground">
                {packLabels[selectedPack.name]?.icon} {packLabels[selectedPack.name]?.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedPack.picks_count} {t("packs.creditsUnit")}
              </p>
            </div>
            <CardPaymentForm
              pack={selectedPack}
              onSuccess={handleCardSuccess}
              onError={handleCardError}
              onCancel={handleCardCancel}
            />
          </div>
        ) : (
          <>
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
              {canUseRealPaymentTrial(user.id, isAdmin) && (
                <p role="status" className="text-sm text-muted-foreground mb-3">
                  Visa con Stripe · Pago real solo para tu cuenta. El importe se cobrará al confirmar en Stripe; puede haber comisiones.
                </p>
              )}
              {packs.map((pack) => {
                const meta = packLabels[pack.name] || { label: pack.name, icon: "📦" };
                const isPopular = pack.name === "medium";

                return (
                  <button
                    key={pack.id}
                    onClick={() => handleSelectPack(pack)}
                    disabled={processing || (betaMode && !isAdmin)}
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
              {betaMode && !isAdmin && (
                <p role="status" className="text-sm text-muted-foreground mb-3">
                  La compra de créditos no está disponible durante la prueba. No se realizará ningún cobro.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                🔒 {t("packs.info")}
              </p>
            </div>
          </>
        )}
      </div>

      {selectedPack && (
        <PaymentSimulationModal
          open={showSimulation}
          onOpenChange={(open) => {
            setShowSimulation(open);
            if (!open) setSelectedPack(null);
          }}
          onPaymentComplete={handleBetaPaymentComplete}
          action="add"
          amount={Number(selectedPack.price)}
        />
      )}
    </div>
  );
};

export default BuyPacks;
