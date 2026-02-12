import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, Plus, User, Sparkles, Loader2 } from "lucide-react";
import PickCard from "@/components/PickCard";
import MatchCard from "@/components/MatchCard";
import LanguageSelector from "@/components/LanguageSelector";
import AgeVerificationGate from "@/components/AgeVerificationGate";
import { useAuth } from "@/hooks/useAuth";
import { usePicks } from "@/hooks/usePicks";
import { useMatches } from "@/hooks/useMatches";
import { useProfile } from "@/hooks/useProfile";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { appConfig } from "@/config/app.config";
import { useAppConfig } from "@/hooks/useAppConfig";
import { supabase } from "@/integrations/supabase/client";
import { Ban } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { pendingPicks, loading: picksLoading, deletePick } = usePicks();
  const { matches, loading: matchesLoading } = useMatches();
  const { profile } = useProfile();
  const { appEnabled, loading: configLoading } = useAppConfig();
  const [activeTab, setActiveTab] = useState<"picks" | "matches">("picks");
  const [showAgeGate, setShowAgeGate] = useState(false);
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

   // Age verification gate for mude app
  useEffect(() => {
    if (appConfig.appType === 'mude' && profile && !profile.age_verified) {
      setShowAgeGate(true);
    }
  }, [profile]);

  const handleAgeVerified = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ age_verified: true })
      .eq('user_id', user.id);
    setShowAgeGate(false);
  };

  const handleAgeDeclined = () => {
    navigate("/");
  };

  const handleDeletePick = async (pickId: string) => {
    const result = await deletePick(pickId);
    if (result.success) {
      toast.success(t("pick.deleted"));
      // Mark that next pick addition requires payment (user is changing a pick)
      localStorage.setItem(`payment_required_${appConfig.appType}`, 'true');
    } else {
      toast.error(result.error || t("common.error"));
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = picksLoading || matchesLoading || configLoading;

  if (!configLoading && !appEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
          <Ban className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2 text-center">{appConfig.appName}</h2>
        <p className="text-muted-foreground text-center mb-6">{t("common.appDisabled", "Esta aplicación no está disponible en este momento.")}</p>
        <Button onClick={() => navigate("/")} variant="outline">
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Age verification gate for mude app */}
      {showAgeGate && (
        <AgeVerificationGate onVerified={handleAgeVerified} onCancel={handleAgeDeclined} />
      )}
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: appConfig.primaryColor }}
            >
              <Heart className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground leading-tight">{appConfig.appName}</h1>
              <span 
                className="text-[10px] font-medium uppercase tracking-wider opacity-80"
                style={{ color: appConfig.primaryColor }}
              >
{appConfig.appType === 'love' && '💕 LOVE'}
                {appConfig.appType === 'plan' && '🤝 FRIENDS'}
                {appConfig.appType === 'mude' && '🔥 MUDE'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button 
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 pt-6">
        <div className="flex gap-8 border-b border-border/50">
          <button
            onClick={() => setActiveTab("picks")}
            className={`pb-3 text-sm font-medium transition-all ${
              activeTab === "picks" ? "tab-active" : "tab-inactive"
            }`}
          >
            {t("home.picks")}
            {pendingPicks.length > 0 && (
              <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">
                {pendingPicks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`pb-3 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "matches" ? "tab-active" : "tab-inactive"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {t("home.matches")}
            {matches.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {matches.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "picks" ? (
          <div className="space-y-3">
            {pendingPicks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-2">{t("home.emptyPicks")}</p>
                <p className="text-muted-foreground/60 text-xs">
                  {t("home.emptyPicksHint")}
                </p>
              </div>
            ) : (
              pendingPicks.map((pick, index) => (
                <div
                  key={pick.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <PickCard 
                    pick={{
                      id: pick.id,
                      name: pick.picked_name,
                      initial: pick.picked_name.charAt(0).toUpperCase(),
                      addedAt: formatTimeAgo(pick.created_at, t),
                      status: "pending"
                    }}
                    onClick={() => navigate(`/pick/${pick.id}`)}
                    onDelete={() => handleDeletePick(pick.id)}
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-2">{t("home.emptyMatches")}</p>
                <p className="text-muted-foreground/60 text-xs">
                  {t("home.emptyMatchesHint")}
                </p>
              </div>
            ) : (
              matches.map((match, index) => (
                <div
                  key={match.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => navigate(`/match/${match.id}`)}
                >
                  <MatchCard 
                    match={{
                      id: match.id,
                      name: match.other_user_name,
                      initial: match.other_user_name.charAt(0).toUpperCase(),
                      addedAt: formatTimeAgo(match.created_at, t)
                    }}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => navigate("/add")}
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg"
          variant="gradient"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

function formatTimeAgo(dateString: string, t: (key: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Using simple translations - could be enhanced with plural forms
  if (diffMins < 1) return t("time.now") || "Now";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return t("time.yesterday") || "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

export default Home;
