import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthCriteria {
  met: boolean;
  label: string;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const { t } = useTranslation();

  const criteria: StrengthCriteria[] = useMemo(() => {
    return [
      {
        met: password.length >= 8,
        label: t("auth.password.minLength"),
      },
      {
        met: /[A-Z]/.test(password),
        label: t("auth.password.uppercase"),
      },
      {
        met: /[a-z]/.test(password),
        label: t("auth.password.lowercase"),
      },
      {
        met: /[0-9]/.test(password),
        label: t("auth.password.number"),
      },
    ];
  }, [password, t]);

  const strength = useMemo(() => {
    const metCount = criteria.filter(c => c.met).length;
    if (metCount === 0) return { level: 0, label: "", color: "" };
    if (metCount === 1) return { level: 1, label: t("auth.password.weak"), color: "bg-red-500" };
    if (metCount === 2) return { level: 2, label: t("auth.password.fair"), color: "bg-orange-500" };
    if (metCount === 3) return { level: 3, label: t("auth.password.good"), color: "bg-yellow-500" };
    return { level: 4, label: t("auth.password.strong"), color: "bg-green-500" };
  }, [criteria, t]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`flex-1 h-full transition-colors duration-200 ${
                level <= strength.level ? strength.color : "bg-secondary"
              }`}
            />
          ))}
        </div>
        {strength.label && (
          <span className={`text-xs font-medium ${
            strength.level <= 1 ? "text-red-500" : 
            strength.level === 2 ? "text-orange-500" : 
            strength.level === 3 ? "text-yellow-500" : "text-green-500"
          }`}>
            {strength.label}
          </span>
        )}
      </div>

      {/* Criteria list */}
      <div className="grid grid-cols-2 gap-1">
        {criteria.map((criterion, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              criterion.met ? "text-green-500" : "text-muted-foreground"
            }`}
          >
            {criterion.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{criterion.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
