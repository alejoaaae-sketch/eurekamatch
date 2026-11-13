import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Users, Flame, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAllAppConfigs } from "@/hooks/useAllAppConfigs";
import { Link } from "react-router-dom";
import type { AppType } from "@/config/app.config";
import { LANDING_EXPERIMENT_ENABLED, landingExperimentCopy } from "@/config/landing-experiment";
import LegacyLanding from "./LegacyLanding";
import mutualGlance from "@/assets/mutual-glance.jpg";

const modes = [
  { type: 'love', label: 'Corazón', Icon: Heart },
  { type: 'friends', label: 'Personas', Icon: Users },
  { type: 'sex', label: 'Llama (solo mayores de 18 años)', Icon: Flame },
  { type: 'hobby', label: 'Trofeo', Icon: Trophy },
] as const;

function ExperimentLanding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAppEnabled, loading: configLoading } = useAllAppConfigs();
  const copy = landingExperimentCopy;

  const selectMode = (type: AppType) => {
    sessionStorage.setItem('eureka_app_type', type);
    navigate(user ? '/home' : `/app?app=${type}`);
  };

  return (
    <div className="landing-experiment min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <span className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-primary" /> EurekaMatch</span>
        </div>
      </header>
      <section className="landing-scene relative isolate overflow-hidden">
        <img src={mutualGlance} width={1536} height={1024} alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" />
        <div className="landing-scene-shade absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 md:px-8 md:pb-14 md:pt-20">
          <div className="max-w-xl">
            <p className="mb-6 text-sm font-medium text-primary">EurekaMatch</p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">{copy.title}</h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-secondary-foreground md:text-lg">{copy.subtitle}</p>
          </div>
          <div className="mt-12 max-w-xl md:mt-16">
            <h2 className="mb-5 text-base font-medium">{copy.choose}</h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {modes.map(({ type, label, Icon }) => {
                const enabled = isAppEnabled(type);
                return (
                  <Button key={type} variant="ghost" disabled={authLoading || configLoading || !enabled} aria-label={label} title={label} onClick={() => selectMode(type)} className={`landing-mode landing-mode-${type} group h-20 flex-col gap-3 rounded-lg px-1 py-3 whitespace-normal`}>
                    <span className="landing-mode-icon flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-105"><Icon aria-hidden="true" className="h-7 w-7" /></span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-border px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold">{t('landing.concept.title', { lng: 'es' })}</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{t('landing.concept.description', { lng: 'es' })}</p>
        </div>
      </section>
      <footer className="border-t border-border px-5 py-7">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms">Términos y Condiciones</Link><span>·</span><Link to="/privacy">Política de Privacidad</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} EurekaMatch. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default function Landing() {
  return LANDING_EXPERIMENT_ENABLED ? <ExperimentLanding /> : <LegacyLanding />;
}
