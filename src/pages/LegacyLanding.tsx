import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Users, Flame, Sparkles, ArrowRight, Beaker, Trophy, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LanguageSelector from "@/components/LanguageSelector";
import LegalFooter from "@/components/LegalFooter";
import { getAppConfig, AppType } from "@/config/app.config";
import { useAllAppConfigs } from "@/hooks/useAllAppConfigs";

const YOUTUBE_VIDEOS: Record<string, string> = {
  es: "cd2WTc-sh7w",
  fr: "Ttk-L5WnLtU",
  default: "qgHIIkfP3bQ",
};

const SPANISH_LANGS = ["es", "gl", "ca", "eu"];
const FRENCH_LANGS = ["fr"];

const getYoutubeId = (lang: string): string => {
  if (SPANISH_LANGS.includes(lang)) return YOUTUBE_VIDEOS.es;
  if (FRENCH_LANGS.includes(lang)) return YOUTUBE_VIDEOS.fr;
  return YOUTUBE_VIDEOS.default;
};

const Landing = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const { isAppEnabled, loading: configLoading } = useAllAppConfigs();

  const youtubeEmbedUrl = useMemo(
    () => `https://www.youtube-nocookie.com/embed/${getYoutubeId(i18n.language)}`,
    [i18n.language]
  );

  // No redirect — logged-in users can use this page as an app switcher

  const appVariants: { type: AppType; icon: React.ReactNode; gradient: string; hoverGradient: string }[] = [
    {
      type: 'love',
      icon: <Heart className="w-8 h-8" fill="currentColor" />,
      gradient: 'from-rose-500 to-pink-500',
      hoverGradient: 'hover:from-rose-600 hover:to-pink-600',
    },
    {
      type: 'friends',
      icon: <Users className="w-8 h-8" />,
      gradient: 'from-orange-500 to-amber-500',
      hoverGradient: 'hover:from-orange-600 hover:to-amber-600',
    },
    {
      type: 'sex',
      icon: <Flame className="w-8 h-8" fill="currentColor" />,
      gradient: 'from-red-600 to-rose-500',
      hoverGradient: 'hover:from-red-700 hover:to-rose-600',
    },
    {
      type: 'hobby',
      icon: <Trophy className="w-8 h-8" />,
      gradient: 'from-green-500 to-emerald-500',
      hoverGradient: 'hover:from-green-600 hover:to-emerald-600',
    },
  ];

  const handleAppSelect = (appType: AppType) => {
    sessionStorage.setItem('eureka_app_type', appType);
    // If logged in, go straight to home; otherwise show app landing
    if (user) {
      navigate("/home");
    } else {
      navigate(`/app?app=${appType}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold text-foreground">EUREKA</span>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-16 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-radial from-violet-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        
        {/* Animated circles/shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse bg-violet-500" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 animate-pulse bg-purple-500" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full blur-3xl opacity-10 animate-pulse bg-pink-500" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Beta badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border/50 text-sm text-muted-foreground mb-8 animate-fade-in-up">
            <Beaker className="w-4 h-4 text-violet-400" />
            <span>{t("landing.beta.badge")}</span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in-up animate-delay-100">
            {t("landing.hero.title")}
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-4 animate-fade-in-up animate-delay-200 max-w-2xl mx-auto">
            {t("landing.hero.subtitle")}
          </p>

          {/* Development notice */}
          <p className="text-sm text-muted-foreground/70 mb-12 animate-fade-in-up animate-delay-300">
            {t("landing.hero.devNotice")}
          </p>

          {/* App variants section */}
          <div className="animate-fade-in-up animate-delay-400">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-8">
              {t("landing.variants.title")}
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {appVariants.map((variant) => {
                const config = getAppConfig(variant.type);
                const enabled = isAppEnabled(variant.type);
                return (
                  <button
                    key={variant.type}
                    onClick={() => enabled && handleAppSelect(variant.type)}
                    disabled={!enabled}
                    className={`group relative p-6 rounded-2xl bg-card border border-border/50 transition-all duration-300 ${
                      enabled
                        ? 'hover:border-transparent hover:scale-[1.02] hover:shadow-xl cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {enabled && (
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${variant.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    )}
                    
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br ${variant.gradient} text-white shadow-lg ${!enabled ? 'grayscale' : ''}`}>
                      {variant.icon}
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {config.appName}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-4">
                      {enabled
                        ? t(`landing.variants.${variant.type}.tagline`)
                        : t("common.comingSoon", "Próximamente")}
                    </p>

                    {enabled ? (
                      <div className={`inline-flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${variant.gradient} bg-clip-text text-transparent`}>
                        {t("landing.variants.explore")}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: variant.type === 'love' ? '#f43f5e' : variant.type === 'friends' ? '#f97316' : variant.type === 'sex' ? '#dc2626' : '#22c55e' }} />
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                        {t("common.disabled", "No disponible")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16 px-6 bg-card/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t("landing.video.title")}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {t("landing.video.subtitle")}
          </p>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-black">
            <video
              className="w-full aspect-video"
              controls
              preload="metadata"
              playsInline
              poster=""
            >
              <source src="/videos/eureka-explainer.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* How it works - simplified */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            {t("landing.concept.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("landing.concept.description")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="px-4 py-2 rounded-full bg-secondary text-violet-400">
              {t("landing.concept.feature1")}
            </span>
            <span className="px-4 py-2 rounded-full bg-secondary text-violet-400">
              {t("landing.concept.feature2")}
            </span>
            <span className="px-4 py-2 rounded-full bg-secondary text-violet-400">
              {t("landing.concept.feature3")}
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <LegalFooter />
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} EUREKA. {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
