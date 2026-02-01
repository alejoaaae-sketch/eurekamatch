import { useTranslation } from "react-i18next";
import { Clock, Trash2, ChevronRight } from "lucide-react";

interface Pick {
  id: string;
  name: string;
  initial: string;
  addedAt: string;
  status: "pending" | "matched";
}

interface PickCardProps {
  pick: Pick;
  onDelete?: () => void;
  onClick?: () => void;
}

const PickCard = ({ pick, onDelete, onClick }: PickCardProps) => {
  const { t } = useTranslation();
  
  return (
    <div 
      className="pick-card group cursor-pointer"
      onClick={onClick}
    >
      <div className="avatar-placeholder bg-secondary">
        {pick.initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium truncate">{pick.name}</p>
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5">
          <Clock className="w-3 h-3" />
          <span>{pick.addedAt}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {t("home.pending")}
        </span>
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default PickCard;
