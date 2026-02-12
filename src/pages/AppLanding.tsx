import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, Users, Flame, Sparkles, ArrowLeft, Shield, Lock, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import LanguageSelector from "@/components/LanguageSelector";
import LegalFooter from "@/components/LegalFooter";
import { getAppConfig, AppType } from "@/config/app.config";
import { useAllAppConfigs } from "@/hooks/useAllAppConfigs";
import { Ban } from "lucide-react";

const AppLanding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { isAppEnabled, getPricePerChange, loading: configLoading } = useAllAppConfigs();

  const appType = (searchParams.get('app') as AppType) || 'love';
  const appEnabled = isAppEnabled(appType);
  const config = getAppConfig(appType);

  // Store the app type in sessionStorage
  useEffect(() => {
    if (appType) {
      sessionStorage.setItem('eureka_app_type', appType);
    }
  }, [appType]);

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  const getAppIcon = () => {
    switch (appType) {
      case 'love':
        return <Heart className="w-10 h-10" fill="currentColor" />;
      case 'plan':
        return <Users className="w-10 h-10" />;
      case 'mude':
        return <Flame className="w-10 h-10" fill="currentColor" />;
      default:
        return <Heart className="w-10 h-10" fill="currentColor" />;
    }
  };

  const getGradient = () => {
    switch (appType) {
      case 'love':
        return 'from-rose-500 to-pink-500';
      case 'plan':
        return 'from-orange-500 to-amber-500';
      case 'mude':
        return 'from-red-600 to-rose-500';
      default:
        return 'from-rose-500 to-pink-500';
    }
  };

  const getAccentColor = () => {
    switch (appType) {
      case 'love':
        return 'text-rose-400';
      case 'plan':
        return 'text-orange-400';
      case 'mude':
        return 'text-red-400';
      default:
        return 'text-rose-400';
    }
  };

  const getBgGlow = () => {
    switch (appType) {
      case 'love':
        return 'bg-rose-500';
      case 'plan':
        return 'bg-orange-500';
      case 'mude':
        return 'bg-red-500';
      default:
        return 'bg-rose-500';
    }
  };

  const pricePerChange = getPricePerChange(appType);

  const steps = [
    {
      number: 0,
      title: t("appLanding.steps.step1.title"),
      description: t("appLanding.steps.step1.description"),
    },
    {
      number: 1,
      title: t(`appLanding.steps.step2.${appType}.title`),
      description: t(`appLanding.steps.step2.${appType}.description`),
    },
    {
      number: 2,
      title: t("appLanding.steps.step3.title"),
      description: t("appLanding.steps.step3.description"),
    },
    {
      number: 3,
      title: t("appLanding.steps.step4.title"),
      description: t("appLanding.steps.step4.description"),
    },
  ];

  const features = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: t("appLanding.features.privacy.title"),
      description: t("appLanding.features.privacy.description"),
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: t("appLanding.features.noRejection.title"),
      description: t("appLanding.features.noRejection.description"),
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: t("appLanding.features.connection.title"),
      description: t("appLanding.features.connection.description"),
    },
  ];

  if (!appEnabled && !configLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
          <Ban className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2 text-center">{config.appName}</h2>
        <p className="text-muted-foreground text-center mb-6">{t("common.appDisabled", "Esta aplicación no está disponible en este momento.")}</p>
        <Button onClick={() => navigate("/")} variant="outline">
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">{t("common.back")}</span>
          </button>
          <LanguageSelector />
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-16 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        
        {/* Animated circles/shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse ${getBgGlow()}`} />
          <div className={`absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 animate-pulse ${getBgGlow()}`} style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* App Icon */}
          <div 
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br ${getGradient()} text-white shadow-xl animate-fade-in-up`}
          >
            {getAppIcon()}
          </div>

          {/* App name */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 animate-fade-in-up animate-delay-100">
            {config.appName}
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 animate-fade-in-up animate-delay-200 max-w-lg mx-auto">
            {t(`appLanding.${appType}.description`)}
          </p>

          {/* CTA Button */}
          <Button
            onClick={() => navigate(`/login?app=${appType}`)}
            size="lg"
            className={`bg-gradient-to-r ${getGradient()} hover:opacity-90 text-white px-8 py-6 text-lg font-medium rounded-xl shadow-lg animate-fade-in-up animate-delay-400`}
          >
            {t("appLanding.cta")}
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-card/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
            {t("appLanding.howItWorks")}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="flex gap-4 p-5 rounded-xl bg-card border border-border/50 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${getGradient()} text-white font-bold text-xl`}>
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Step 4 - Beta / pricing note */}
          <div 
            className="mt-6 p-5 rounded-xl bg-muted/30 border border-border/30 animate-fade-in-up text-center"
            style={{ animationDelay: '0.5s' }}
          >
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              {t("appLanding.steps.step5.description", { price: `${pricePerChange} €` })}
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
            {t("appLanding.whyUs")}
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="text-center p-6 rounded-xl bg-card border border-border/50 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-secondary ${getAccentColor()}`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 bg-card/30">
        <div className="max-w-xl mx-auto text-center">
          <Sparkles className={`w-8 h-8 mx-auto mb-4 ${getAccentColor()}`} />
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            {t("appLanding.readyToStart")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("appLanding.readyDescription")}
          </p>
          <Button
            onClick={() => navigate(`/login?app=${appType}`)}
            size="lg"
            className={`bg-gradient-to-r ${getGradient()} hover:opacity-90 text-white px-8 py-6 text-lg font-medium rounded-xl shadow-lg`}
          >
            {t("appLanding.cta")}
          </Button>
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

export default AppLanding;
