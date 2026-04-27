import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Heart, UserPlus, Sparkles, ArrowRight, X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "eureka_onboarding_completed_v1";

interface Step {
  icon: typeof Heart;
  titleKey: string;
  descKey: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    titleKey: "onboarding.step1Title",
    descKey: "onboarding.step1Desc",
    accent: "from-primary/30 to-primary/5",
  },
  {
    icon: UserPlus,
    titleKey: "onboarding.step2Title",
    descKey: "onboarding.step2Desc",
    accent: "from-rose-500/30 to-rose-500/5",
  },
  {
    icon: Gift,
    titleKey: "onboarding.step3Title",
    descKey: "onboarding.step3Desc",
    accent: "from-amber-500/30 to-amber-500/5",
  },
];

const OnboardingWizard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Pequeño delay para que entre con animación tras render
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
      navigate("/add");
    }
  };

  const handleSkip = () => {
    close();
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-6 animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label={t("common.cancel")}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero gradient */}
        <div className={`relative h-44 bg-gradient-to-br ${current.accent} flex items-center justify-center`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/0.15),_transparent_70%)]" />
          <div className="relative w-20 h-20 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-xl">
            <Icon className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-6 pb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
            {t(current.titleKey)}
          </h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
            {t(current.descKey)}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-secondary"
                }`}
              />
            ))}
          </div>

          {/* CTA */}
          <Button
            onClick={handleNext}
            className="w-full"
            size="lg"
            variant={isLast ? "gradient" : "default"}
          >
            {isLast ? (
              <>
                {t("onboarding.cta")}
                <Heart className="w-4 h-4" fill="currentColor" />
              </>
            ) : (
              <>
                {t("onboarding.next")}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {!isLast && (
            <button
              onClick={handleSkip}
              className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("onboarding.skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
