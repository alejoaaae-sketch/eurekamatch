import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UserPlus, Phone, AlertCircle, Loader2, Ban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePicks } from "@/hooks/usePicks";
import { useAppConfig } from "@/hooks/useAppConfig";
import { toast } from "sonner";
import { appConfig, BETA_MODE } from "@/config/app.config";
import PaymentSimulationModal from "@/components/PaymentSimulationModal";

const AddPick = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { addPick, picks, loading: picksLoading } = usePicks();
  const { effectiveMaxPicks, pricePerChange, loading: configLoading } = useAppConfig();
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [, forceUpdate] = useState(0);
  
  // Force re-render when language changes
  useEffect(() => {
    const handleLanguageChange = () => forceUpdate(n => n + 1);
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  // Force re-render when language changes
  useEffect(() => {
    const handleLanguageChange = () => forceUpdate(n => n + 1);
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const currentPicksCount = picks.filter(p => !p.is_matched).length;
  const canAddMore = currentPicksCount < effectiveMaxPicks;
  
  // Check if payment is required (user deleted a pick and is adding a new one)
  // In BETA_MODE, payments are disabled
  const paymentRequired = !BETA_MODE && localStorage.getItem(`payment_required_${appConfig.appType}`) === 'true';

  // Clear payment flag if in BETA_MODE
  useEffect(() => {
    if (BETA_MODE) {
      localStorage.removeItem(`payment_required_${appConfig.appType}`);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canAddMore) {
      toast.error(t("pick.limitMessage", { count: effectiveMaxPicks }));
      return;
    }

    // If payment is required, show payment modal instead of adding directly
    if (paymentRequired) {
      setShowPaymentModal(true);
      return;
    }

    await proceedWithAddPick();
  };

  const proceedWithAddPick = async () => {
    setLoading(true);

    try {
      const result = await addPick(name, value, 'phone');
      if (result.success) {
        // Clear the payment required flag after successful addition
        localStorage.removeItem(`payment_required_${appConfig.appType}`);
        toast.success(t("pick.added"));
        navigate("/home");
      } else {
        toast.error(result.error || t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    setShowPaymentModal(false);
    await proceedWithAddPick();
  };

  if (authLoading || picksLoading || configLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show limit reached screen
  if (!canAddMore) {
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
            <h1 className="text-lg font-semibold text-foreground">{t("pick.add")}</h1>
          </div>
        </header>

        <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Ban className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2 text-center">
            {t("pick.limit")}
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {t("pick.limitMessage", { count: effectiveMaxPicks })}
          </p>
          <Button onClick={() => navigate("/home")} variant="outline">
            {t("common.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t("pick.add")}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <UserPlus className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        {/* Description */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-foreground mb-2">
            {t("pick.addSubtitle")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("pick.phoneHint")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t("pick.name")}
            </label>
            <Input
              type="text"
              placeholder={t("pick.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t("pick.phone")}
            </label>
            <Input
              type="tel"
              placeholder={t("pick.phonePlaceholder")}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Privacy note */}
          <div className="flex gap-3 bg-secondary/50 rounded-xl p-4 mt-6">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("pick.phoneHint")}
            </p>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : paymentRequired ? (
                `${t("pick.save")} (${pricePerChange.toFixed(2).replace('.', ',')} €)`
              ) : (
                t("pick.save")
              )}
            </Button>
          </div>
        </form>

        {/* Payment Modal */}
        <PaymentSimulationModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          onPaymentComplete={handlePaymentComplete}
          action="change"
        />
      </div>
    </div>
  );
};

export default AddPick;
