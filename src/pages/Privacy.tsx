import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
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
          <h1 className="text-lg font-semibold text-foreground">{t("legal.privacyTitle")}</h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <h2 className="text-xl font-semibold text-foreground">{t("legal.privacyTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("legal.lastUpdated")}: {new Date().toLocaleDateString()}</p>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">1. {t("legal.privacy.dataCollection")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.privacy.dataCollectionText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">2. {t("legal.privacy.dataUse")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.privacy.dataUseText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">3. {t("legal.privacy.dataSharing")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.privacy.dataSharingText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">4. {t("legal.privacy.userRights")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.privacy.userRightsText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">5. {t("legal.privacy.dataDeletion")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.privacy.dataDeletionText")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-medium text-foreground">6. {t("legal.privacy.contact")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("legal.privacy.contactText")}</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
