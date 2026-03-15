import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Trash2, Loader2, AlertTriangle, Heart, Users, Flame, Trophy, Share2, Copy, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllAppConfigs } from "@/hooks/useAllAppConfigs";
import { getAppConfig, AppType } from "@/config/app.config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const APP_VARIANTS: { type: AppType; dbMode: string; icon: React.ReactNode; gradient: string }[] = [
  { type: 'love', dbMode: 'love', icon: <Heart className="w-5 h-5" fill="currentColor" />, gradient: 'from-rose-500 to-pink-500' },
  { type: 'plan', dbMode: 'friends', icon: <Users className="w-5 h-5" />, gradient: 'from-orange-500 to-amber-500' },
  { type: 'mude', dbMode: 'mude', icon: <Flame className="w-5 h-5" fill="currentColor" />, gradient: 'from-red-600 to-rose-500' },
  { type: 'sport', dbMode: 'sport', icon: <Trophy className="w-5 h-5" />, gradient: 'from-green-500 to-emerald-500' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAppEnabled } = useAllAppConfigs();
  const [deleting, setDeleting] = useState(false);
  const [disabledApps, setDisabledApps] = useState<string[]>([]);
  const [loadingToggle, setLoadingToggle] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Fetch user's disabled apps
  useEffect(() => {
    if (!user) return;
    const fetchDisabled = async () => {
      const { data } = await supabase
        .from('user_disabled_apps')
        .select('app_mode')
        .eq('user_id', user.id);
      if (data) setDisabledApps(data.map(d => d.app_mode));
    };
    fetchDisabled();
  }, [user]);

  // Fetch referral code and count
  useEffect(() => {
    if (!user) return;
    const fetchReferral = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();
      if (data?.referral_code) setReferralCode(data.referral_code);

      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', data?.referral_code || '');
      setReferralCount(count || 0);
    };
    fetchReferral();
  }, [user]);

  const handleToggleApp = async (dbMode: string, currentlyEnabled: boolean) => {
    if (!user) return;
    setLoadingToggle(dbMode);
    try {
      if (currentlyEnabled) {
        // Disable: insert row
        const { error } = await supabase.from('user_disabled_apps').insert({ user_id: user.id, app_mode: dbMode });
        if (error) throw error;
        setDisabledApps(prev => [...prev, dbMode]);
      } else {
        // Enable: delete row
        const { error } = await supabase.from('user_disabled_apps').delete().eq('user_id', user.id).eq('app_mode', dbMode);
        if (error) throw error;
        setDisabledApps(prev => prev.filter(m => m !== dbMode));
      }
      toast.success(t("settings.appToggleSuccess"));
    } catch {
      toast.error(t("settings.appToggleError"));
    } finally {
      setLoadingToggle(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t("common.error"));
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t("settings.accountDeleted"));
        await signOut();
        navigate("/");
      } else {
        toast.error(data.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-foreground">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-8">
        {/* Legal links */}
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{t("settings.legal")}</h2>
          <button
            onClick={() => navigate("/terms")}
            className="w-full text-left p-4 rounded-xl bg-card border border-border/50 text-foreground hover:bg-secondary/50 transition-colors"
          >
            {t("legal.termsTitle")}
          </button>
          <button
            onClick={() => navigate("/privacy")}
            className="w-full text-left p-4 rounded-xl bg-card border border-border/50 text-foreground hover:bg-secondary/50 transition-colors"
          >
            {t("legal.privacyTitle")}
          </button>
        </div>

        {/* Referral section */}
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            <Gift className="w-4 h-4 inline mr-1" />
            {t("referral.title")}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">{t("referral.description")}</p>
          
          <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("referral.yourCode")}</p>
                <p className="text-lg font-mono font-bold text-foreground tracking-widest">{referralCode}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(referralCode);
                  toast.success(t("common.copied"));
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={() => {
                const url = `${window.location.origin}/login?ref=${referralCode}`;
                if (navigator.share) {
                  navigator.share({ title: 'EurekaMatch', text: t("referral.shareText"), url });
                } else {
                  navigator.clipboard.writeText(url);
                  toast.success(t("common.copied"));
                }
              }}
            >
              <Share2 className="w-4 h-4" />
              {t("referral.share")}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {t("referral.invited", { count: referralCount })}
            </p>
          </div>
        </div>

        {/* My Apps toggles */}
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">{t("settings.myApps")}</h2>
          <p className="text-xs text-muted-foreground mb-4">{t("settings.myAppsDescription")}</p>
          {APP_VARIANTS.filter(v => isAppEnabled(v.type)).map((variant) => {
            const config = getAppConfig(variant.type);
            const userEnabled = !disabledApps.includes(variant.dbMode);
            return (
              <div
                key={variant.type}
                className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${variant.gradient} text-white`}>
                    {variant.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{config.appName}</p>
                    <p className="text-xs text-muted-foreground">
                      {userEnabled ? t("settings.appEnabled") : t("settings.appDisabled")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loadingToggle === variant.dbMode && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={userEnabled}
                    onCheckedChange={() => handleToggleApp(variant.dbMode, userEnabled)}
                    disabled={loadingToggle !== null}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Danger zone */}
        <div className="border-t border-border pt-8">
          <h2 className="text-sm font-medium text-destructive uppercase tracking-wider mb-4">{t("settings.dangerZone")}</h2>
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("settings.deleteAccount")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("settings.deleteAccountDescription")}</p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {t("settings.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.deleteConfirmDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("settings.confirmDelete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
