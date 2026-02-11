import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

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
