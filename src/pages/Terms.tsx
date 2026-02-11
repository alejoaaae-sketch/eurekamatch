import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
          <h1 className="text-lg font-semibold text-foreground">{t("legal.termsTitle")}</h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <h2 className="text-xl font-semibold text-foreground">{t("legal.termsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("legal.lastUpdated")}: {new Date().toLocaleDateString()}</p>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">1. {t("legal.terms.acceptance")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.terms.acceptanceText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">2. {t("legal.terms.service")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.terms.serviceText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">3. {t("legal.terms.userConduct")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.terms.userConductText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">4. {t("legal.terms.privacy")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.terms.privacyText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">5. {t("legal.terms.termination")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.terms.terminationText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">6. {t("legal.terms.liability")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.terms.liabilityText")}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
