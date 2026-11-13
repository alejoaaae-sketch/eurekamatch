import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UserPlus, Phone, AlertCircle, Loader2, ShoppingCart, Contact } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePicks } from "@/hooks/usePicks";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useProfile } from "@/hooks/useProfile";
import { usePickBalance } from "@/hooks/usePickBalance";
import { toast } from "sonner";
import { appConfig } from "@/config/app.config";
import PhoneVerification from "@/components/PhoneVerification";
import { supabase } from "@/integrations/supabase/client";
import { additionCost, CONSERVED_LIMIT, daysRemaining, PRINCIPAL_LIMIT, replacementCost } from '@/lib/selection-rules';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { addPick, pendingPicks, loading: picksLoading } = usePicks();
  const { appEnabled, verifyMobile, betaMode, effectiveMaxPicks, loading: configLoading } = useAppConfig();
  const { profile, refetch: refetchProfile } = useProfile();
  const { picksRemaining, loading: balanceLoading } = usePickBalance();
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [keepPrevious, setKeepPrevious] = useState(false);
  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
  const [acceptRemainingDays, setAcceptRemainingDays] = useState(false);
  const [historicalCount, setHistoricalCount] = useState<number | null>(null);
  const isLove = appConfig.appType === 'love';
  const replaceId = isLove ? searchParams.get('replace') : null;
  const replacedPick = pendingPicks.find(p => p.id === replaceId && p.selection_kind === 'principal');
  const conservedCount = pendingPicks.filter(p => p.selection_kind === 'conserved').length;
  const cost = isLove ? (replacedPick ? replacementCost(keepPrevious) : additionCost(historicalCount ?? 2)) : (betaMode ? 0 : 1);
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

  const canAddMore = isLove ? picksRemaining >= cost : betaMode || picksRemaining > 0;
  const [activePicksCount, setActivePicksCount] = useState<number | null>(null);

  // Fetch active picks count for this app
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      // Solo cuenta picks activos SIN match (alineado con el trigger check_pick_limit en BD).
      // Los picks con match no ocupan slot porque ya están "resueltos".
      let query = supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .eq('picker_id', user.id)
        .eq('app_type', appConfig.appType)
        .is('deleted_at', null)
        .eq('is_matched', false);
      if (isLove) query = query.eq('selection_kind', 'principal').gt('expires_at', new Date().toISOString());
      const { count, error } = await query;
      if (error) { toast.error('No se pudieron comprobar tus elecciones'); return; }
      setActivePicksCount(count ?? 0);
      const { count: total } = await supabase.from('picks').select('id', { count: 'exact', head: true }).eq('picker_id', user.id).eq('app_type', appConfig.appType);
      setHistoricalCount(total ?? 2);
    };
    fetchCount();
  }, [user]);

  const atPickLimit = activePicksCount !== null && activePicksCount >= (isLove ? PRINCIPAL_LIMIT : effectiveMaxPicks) && !replacedPick;

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
    if (replaceId && !replacedPick) { toast.error('Esta elección ya no está disponible para cambiarla'); navigate('/home'); return; }
    if (keepPrevious && conservedCount >= CONSERVED_LIMIT) { toast.error('Ya tienes 5 elecciones conservadas'); return; }
    
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

    if (isLove && cost > 0) { setAcceptRemainingDays(false); setShowCostConfirmation(true); return; }
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
    // phone_verified is set server-side by verify-otp; just refresh the profile.
    if (user) {
      await refetchProfile();
    }
    setShowPhoneVerification(false);
    toast.success(t("auth.phoneVerified"));
    if (isLove && cost > 0) { setShowCostConfirmation(true); return; }
    await proceedWithAddPick();
  };

  const proceedWithAddPick = async () => {
    setLoading(true);

    try {
      // The insert trigger charges replacements atomically; never debit separately.
      const result = await addPick(name, value, 'phone', { replacedPickId: replacedPick?.id, keepPrevious });
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

  if (authLoading || picksLoading || configLoading || balanceLoading || activePicksCount === null || (isLove && historicalCount === null) || !user) {
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
  if (!canAddMore && !replacedPick) {
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
          <h1 className="text-lg font-semibold text-foreground">{replacedPick ? 'Cambiar elección' : t("pick.add")}</h1>
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

        {/* Contact Picker Button (mobile only, when API available) */}
        {'contacts' in navigator && 'ContactsManager' in window && (
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 gap-2"
            disabled={loading}
            onClick={async () => {
              try {
                const contacts = await (navigator as any).contacts.select(
                  ['name', 'tel'],
                  { multiple: false }
                );
                if (contacts && contacts.length > 0) {
                  const contact = contacts[0];
                  if (contact.name && contact.name.length > 0) {
                    setName(contact.name[0]);
                  }
                  if (contact.tel && contact.tel.length > 0) {
                    setValue(contact.tel[0].replace(/\s/g, ''));
                  }
                }
              } catch (err) {
                // User cancelled or API error - do nothing
              }
            }}
          >
            <Contact className="w-5 h-5" />
            {t("pick.selectContact")}
          </Button>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {replacedPick && <fieldset className="space-y-3 border-b border-border pb-5">
            <legend className="mb-3 text-sm font-medium text-foreground">Al cambiar a {replacedPick.picked_name}</legend>
            <label className="flex items-center gap-3 text-sm text-foreground"><input type="radio" name="previous" checked={!keepPrevious} onChange={() => setKeepPrevious(false)} />Eliminar la anterior · 1 crédito</label>
            <label className="flex items-center gap-3 text-sm text-foreground"><input type="radio" name="previous" checked={keepPrevious} disabled={conservedCount >= CONSERVED_LIMIT} onChange={() => setKeepPrevious(true)} />Conservar la anterior · 3 créditos</label>
            <p className="text-xs text-muted-foreground">A {replacedPick.picked_name} le quedan {daysRemaining(replacedPick.expires_at ?? '')} días. Conservarla no reinicia su plazo.</p>
            {conservedCount >= CONSERVED_LIMIT && <p className="text-xs text-destructive">Tus 5 plazas conservadas están ocupadas.</p>}
          </fieldset>}
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
            <Button type="submit" className="w-full" size="lg" disabled={loading || !canAddMore}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isLove ? `${replacedPick ? 'Cambiar elección' : 'Guardar elección'} · ${cost === 0 ? 'Gratis' : `${cost} ${cost === 1 ? 'crédito' : 'créditos'}`}` : t("pick.save")
              )}
            </Button>
            {(isLove || !betaMode) && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isLove ? `Saldo: ${picksRemaining} créditos` : t("packs.picksRemaining", { count: picksRemaining })}
              </p>
            )}
            {replacedPick && !canAddMore && <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => navigate('/buy-packs')}>Comprar créditos</Button>}
          </div>
        </form>
        <AlertDialog open={showCostConfirmation} onOpenChange={setShowCostConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirmar {replacedPick ? 'cambio' : 'elección'}</AlertDialogTitle><AlertDialogDescription>
              Se descontarán {cost} {cost === 1 ? 'crédito' : 'créditos'} de tu saldo. {keepPrevious && replacedPick ? `${replacedPick.picked_name} se conservará durante los ${daysRemaining(replacedPick.expires_at ?? '')} días que le quedan, sin reiniciar la caducidad.` : replacedPick ? `${replacedPick.picked_name} dejará de participar en nuevas coincidencias.` : 'La nueva elección tendrá una vigencia de 90 días.'}
            </AlertDialogDescription></AlertDialogHeader>
            {keepPrevious && <label className="flex items-start gap-3 text-sm text-foreground"><Checkbox checked={acceptRemainingDays} onCheckedChange={value => setAcceptRemainingDays(value === true)} />Acepto conservar la elección solo durante sus días restantes.</label>}
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><Button disabled={loading || (keepPrevious && !acceptRemainingDays)} onClick={async () => { setShowCostConfirmation(false); await proceedWithAddPick(); }}>Confirmar · {cost} {cost === 1 ? 'crédito' : 'créditos'}</Button></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
