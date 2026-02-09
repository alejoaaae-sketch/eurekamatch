import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Phone, Loader2, AlertCircle, Globe, Settings, Mail, CheckCircle2, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLanguage } from "@/hooks/useLanguage";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { currentLanguage, languages, changeLanguage } = useLanguage();
  const { isAdmin } = useAdmin();
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [, forceUpdate] = useState(0);
  
  // Force re-render when language changes
  useEffect(() => {
    const handleLanguageChange = () => forceUpdate(n => n + 1);
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || "");
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Phone is required
    if (!phone.trim()) {
      toast.error(t("profile.phoneRequired"));
      return;
    }
    
    setSaving(true);

    try {
      const result = await updateProfile({
        phone: phone.trim(),
        display_name: displayName.trim() || undefined,
      });

      if (result.success) {
        toast.success(t("profile.saved"));
      } else {
        toast.error(result.error || t("common.error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleResendVerification = async () => {
    if (!user || !profile?.email) return;
    setResendingEmail(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t("profile.verificationSent"));
      } else {
        toast.error(data.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setResendingEmail(false);
    }
  };

  if (authLoading || profileLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <h1 className="text-lg font-semibold text-foreground">{t("profile.title")}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        {/* Email (read-only) with verification status */}
        <div className="text-center mb-8 space-y-2">
          <p className="text-muted-foreground text-sm">{profile?.email || user.email}</p>
          {profile?.email && (
            profile.email_verified ? (
              <div className="flex items-center justify-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t("profile.emailVerified")}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{t("profile.emailNotVerified")}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="text-xs h-7"
                >
                  {resendingEmail ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Mail className="w-3 h-3 mr-1" />
                  )}
                  {t("profile.resendVerification")}
                </Button>
              </div>
            )
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {t("profile.displayName")}
            </label>
            <Input
              type="text"
              placeholder={t("profile.displayNamePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t("profile.phone")} *
            </label>
            <Input
              type="tel"
              placeholder={t("profile.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          {/* Language selector */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t("profile.language")}
            </label>
            <Select
              value={currentLanguage}
              onValueChange={(value) => changeLanguage(value as any)}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span>{lang.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info about phone matching */}
          <div className="flex gap-3 bg-secondary/50 rounded-xl p-4 mt-6">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("profile.phoneHint")}
            </p>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" size="lg" disabled={saving}>
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t("profile.save")
              )}
            </Button>
          </div>
        </form>

        {/* Admin panel link */}
        {isAdmin && (
          <div className="mt-8 pt-8 border-t border-border">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate("/admin")}
            >
              <Settings className="w-4 h-4" />
              Admin Panel
            </Button>
          </div>
        )}

        {/* Sign out */}
        <div className={`${isAdmin ? 'mt-4' : 'mt-8 pt-8 border-t border-border'}`}>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            {t("profile.logout")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
