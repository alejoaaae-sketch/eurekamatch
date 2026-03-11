import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Gift, X, Heart, Users, Flame, Trophy } from "lucide-react";

const APP_ICONS = [
  { icon: Heart, color: "text-rose-500", label: "Love" },
  { icon: Users, color: "text-orange-500", label: "Friends" },
  { icon: Flame, color: "text-red-500", label: "Sex" },
  { icon: Trophy, color: "text-emerald-500", label: "Hobby" },
];

const WelcomeCreditsBanner = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("eureka_welcome_dismissed");
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("eureka_welcome_dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="mx-6 mt-4 relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-5 animate-fade-in-up">
      {/* Close button */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Gift icon */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("welcome.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("welcome.subtitle")}</p>
        </div>
      </div>

      {/* 4 app icons */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {APP_ICONS.map(({ icon: Icon, color, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl bg-secondary/50"
          >
            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
              <Icon className={`w-4 h-4 ${color}`} fill="currentColor" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground/80 mt-3 text-center">
        {t("welcome.description")}
      </p>
    </div>
  );
};

export default WelcomeCreditsBanner;
