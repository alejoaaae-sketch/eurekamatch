import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, Users, Flame, Shield, Eye, Sparkles, ArrowRight } from "lucide-react";
import { appConfig, currentAppType } from "@/config/app.config";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import LanguageSelector from "@/components/LanguageSelector";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  const getAppIcon = () => {
    switch (currentAppType) {
      case 'love':
        return <Heart className="w-8 h-8" fill="currentColor" />;
      case 'plan':
        return <Users className="w-8 h-8" />;
      case 'sex':
        return <Flame className="w-8 h-8" fill="currentColor" />;
    }
  };

  const getHeroGradient = () => {
    switch (currentAppType) {
      case 'love':
        return 'from-rose-500/20 via-pink-500/10 to-transparent';
      case 'plan':
        return 'from-orange-500/20 via-amber-500/10 to-transparent';
      case 'sex':
        return 'from-red-600/20 via-rose-500/10 to-transparent';
    }
  };

  const getAccentColor = () => {
    switch (currentAppType) {
      case 'love':
        return 'text-rose-400';
      case 'plan':
        return 'text-orange-400';
      case 'sex':
        return 'text-red-400';
    }
  };

  const getBorderAccent = () => {
    switch (currentAppType) {
      case 'love':
        return 'border-rose-500/30 hover:border-rose-500/50';
      case 'plan':
        return 'border-orange-500/30 hover:border-orange-500/50';
      case 'sex':
        return 'border-red-500/30 hover:border-red-500/50';
    }
  };

  const getButtonStyle = () => {
    switch (currentAppType) {
      case 'love':
        return 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600';
      case 'plan':
        return 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600';
      case 'sex':
        return 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ background: appConfig.primaryColor }}
            >
              {getAppIcon()}
            </div>
            <span className="text-lg font-semibold text-foreground">{appConfig.appName}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/login")}
              className="text-muted-foreground hover:text-foreground"
            >
              {t("auth.login")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 relative overflow-hidden">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-radial ${getHeroGradient()} pointer-events-none`} />
        
        {/* Animated circles/shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse"
            style={{ background: appConfig.primaryColor }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 animate-pulse"
            style={{ background: appConfig.accentColor, animationDelay: '1s' }}
          />
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Icon */}
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 text-white animate-fade-in-up"
            style={{ background: `linear-gradient(135deg, ${appConfig.primaryColor}, ${appConfig.accentColor})` }}
          >
            {getAppIcon()}
          </div>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 animate-fade-in-up animate-delay-100">
            {t(`landing.headline.${currentAppType}`)}
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 animate-fade-in-up animate-delay-200">
            {t(`landing.subheadline.${currentAppType}`)}
          </p>

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/login")}
            size="lg"
            className={`${getButtonStyle()} text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-up animate-delay-300`}
          >
            {t("landing.cta")}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            {t("landing.howItWorks.title")}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <div 
                key={step}
                className={`glass-card p-6 text-center border ${getBorderAccent()} transition-all duration-300`}
              >
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${getAccentColor()} bg-secondary`}
                >
                  <span className="text-xl font-bold">{step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t(`landing.howItWorks.step${step}.title`)}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step === 3 
                    ? t(`landing.howItWorks.step3.description.${currentAppType}`)
                    : t(`landing.howItWorks.step${step}.description`)
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 md:p-12 text-center">
            <div className="flex justify-center gap-6 mb-6">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getAccentColor()} bg-secondary`}>
                <Shield className="w-7 h-7" />
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getAccentColor()} bg-secondary`}>
                <Eye className="w-7 h-7" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t("landing.privacy.title")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              {t("landing.privacy.description")}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className={`px-4 py-2 rounded-full bg-secondary ${getAccentColor()}`}>
                {t("landing.privacy.feature1")}
              </span>
              <span className={`px-4 py-2 rounded-full bg-secondary ${getAccentColor()}`}>
                {t("landing.privacy.feature2")}
              </span>
              <span className={`px-4 py-2 rounded-full bg-secondary ${getAccentColor()}`}>
                {t("landing.privacy.feature3")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <Sparkles className={`w-10 h-10 mx-auto mb-4 ${getAccentColor()}`} />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t("landing.finalCta.title")}
          </h2>
          <p className="text-muted-foreground mb-8">
            {t("landing.finalCta.subtitle")}
          </p>
          <Button
            onClick={() => navigate("/login")}
            size="lg"
            className={`${getButtonStyle()} text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300`}
          >
            {t("landing.cta")}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} {appConfig.appName}. {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
