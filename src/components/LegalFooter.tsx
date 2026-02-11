import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const LegalFooter = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
      <Link to="/terms" className="hover:text-muted-foreground transition-colors">
        {t("legal.termsTitle")}
      </Link>
      <span>·</span>
      <Link to="/privacy" className="hover:text-muted-foreground transition-colors">
        {t("legal.privacyTitle")}
      </Link>
    </div>
  );
};

export default LegalFooter;
