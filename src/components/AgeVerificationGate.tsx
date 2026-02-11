import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AgeVerificationGateProps {
  onVerified: () => void;
  onCancel: () => void;
}

const AgeVerificationGate = ({ onVerified, onCancel }: AgeVerificationGateProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>{t("ageVerification.title")}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>{t("ageVerification.description")}</p>
            <p className="text-xs text-muted-foreground/70">{t("ageVerification.legalNote")}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("ageVerification.decline")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onVerified} className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            {t("ageVerification.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AgeVerificationGate;
