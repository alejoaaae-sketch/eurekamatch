import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UserPlus, Phone, AlertCircle, Loader2, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePicks } from "@/hooks/usePicks";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useProfile } from "@/hooks/useProfile";
import { usePickBalance } from "@/hooks/usePickBalance";
import { toast } from "sonner";
import { appConfig } from "@/config/app.config";
import PhoneVerification from "@/components/PhoneVerification";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AddPick = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { addPick, loading: picksLoading } = usePicks();
  const { appEnabled, verifyMobile, betaMode, effectiveMaxPicks, loading: configLoading } = useAppConfig();
  const { profile, refetch: refetchProfile } = useProfile();
  const { picksRemaining, consumePick, loading: balanceLoading } = usePickBalance();
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
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

  const canAddMore = betaMode || picksRemaining > 0;
  const [activePicksCount, setActivePicksCount] = useState<number | null>(null);

  // Fetch active picks count for this app
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .eq('picker_id', user.id)
        .eq('app_type', appConfig.appType)
        .is('deleted_at', null);
      setActivePicksCount(count ?? 0);
    };
    fetchCount();
  }, [user]);

  const atPickLimit = !betaMode && activePicksCount !== null && activePicksCount >= effectiveMaxPicks;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const sendOtp = async (): Promise<boolean> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "apikey": supabaseKey,
        },
        body: JSON.stringify({ phone: profile?.phone }),
      });
      const data = await response.json();
      return data.success === true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (atPickLimit) {
      toast.error(t("pick.limit"));
      return;
    }

    if (!canAddMore) {
      navigate("/buy-packs");
      return;
    }

    // Check if phone verification is required and not yet done
    if (verifyMobile && !profile?.phone_verified) {
      setShowVerifyPrompt(true);
      return;
    }

    await proceedWithAddPick();
  };

  const handleConfirmVerify = async () => {
    setShowVerifyPrompt(false);
    setSendingOtp(true);
    const sent = await sendOtp();
    setSendingOtp(false);
    if (sent) {
      toast.success(t("auth.otpSent"));
      setShowPhoneVerification(true);
    } else {
      toast.error(t("auth.sendOtpError"));
    }
  };

  const handlePhoneVerified = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ phone_verified: true })
        .eq('user_id', user.id);
      await refetchProfile();
    }
    setShowPhoneVerification(false);
    toast.success(t("auth.phoneVerified"));
    await proceedWithAddPick();
  };

  const proceedWithAddPick = async () => {
    setLoading(true);

    try {
      // Check if this is a replacement (user has already filled all initial slots before)
      // by counting ALL picks ever created (including soft-deleted) for this app_type
      if (!betaMode) {
        const { count, error: countError } = await supabase
          .from('picks')
          .select('*', { count: 'exact', head: true })
          .eq('picker_id', user!.id)
          .eq('app_type', appConfig.appType);

        if (countError) {
          toast.error(t("common.error"));
          setLoading(false);
          return;
        }

        const totalEverCreated = count ?? 0;
        const isReplacement = totalEverCreated >= effectiveMaxPicks;

        if (isReplacement) {
          const consumeResult = await consumePick();
          if (!consumeResult.success) {
            toast.error(consumeResult.error || t("common.error"));
            setLoading(false);
            return;
          }
        }
      }

      const result = await addPick(name, value, 'phone');
      if (result.success) {
        toast.success(t("pick.added"));
        navigate("/home");
      } else {
        toast.error(result.error || t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!configLoading && !appEnabled) {
    navigate("/home");
    return null;
  }

  if (authLoading || picksLoading || configLoading || balanceLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show at pick limit screen - must delete one first
  if (atPickLimit) {
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
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2 text-center">
            {t("pick.limit")}
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-6 leading-relaxed">
            {t("pick.limitReached", { count: effectiveMaxPicks })}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button onClick={() => navigate("/home")} variant="gradient">
              {t("pick.managePicks")}
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline">
              {t("common.back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show no picks remaining screen (no balance for replacements)
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
            <ShoppingCart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium text-foreground mb-2 text-center">
            {t("packs.noPicks")}
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            {t("packs.noPicksHint")}
          </p>
          <Button onClick={() => navigate("/buy-packs")} variant="gradient">
            {t("packs.buyPacks")}
          </Button>
        </div>
      </div>
    );
  }

  // Show phone verification screen
  if (showPhoneVerification && profile?.phone) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPhoneVerification(false)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{t("auth.verifyPhone")}</h1>
          </div>
        </header>
        <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center">
          <PhoneVerification
            phone={profile.phone}
            onVerified={handlePhoneVerified}
            onBack={() => setShowPhoneVerification(false)}
          />
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
              ) : (
                t("pick.save")
              )}
            </Button>
            {!betaMode && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {t("packs.picksRemaining", { count: picksRemaining })}
              </p>
            )}
          </div>
        </form>

        {/* Phone Verification Prompt */}
        <AlertDialog open={showVerifyPrompt} onOpenChange={setShowVerifyPrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("auth.phoneNotVerified")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("auth.phoneNotVerifiedDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmVerify} disabled={sendingOtp}>
                {sendingOtp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("auth.verifyNow")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AddPick;
