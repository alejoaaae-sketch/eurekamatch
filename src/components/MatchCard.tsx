import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

interface Match {
  id: string;
  name: string;
  initial: string;
  addedAt: string;
}

interface MatchCardProps {
  match: Match;
}

const MatchCard = ({ match }: MatchCardProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="pick-card group cursor-pointer border-primary/30 hover:border-primary/50">
      <div className="w-12 h-12 rounded-full gradient-match flex items-center justify-center text-primary-foreground text-lg font-medium match-animation">
        {match.initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium truncate">{match.name}</p>
        <div className="flex items-center gap-1.5 text-primary text-xs mt-0.5">
          <Sparkles className="w-3 h-3" />
          <span>{t("home.mutualInterest")}</span>
        </div>
      </div>
      <div className="text-muted-foreground text-xs">
        {t("home.view")} →
      </div>
    </div>
  );
};

export default MatchCard;
