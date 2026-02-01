import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Check, Loader2 } from "lucide-react";

interface PaymentSimulationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: () => void;
  action: "add" | "change";
}

const PaymentSimulationModal = ({
  open,
  onOpenChange,
  onPaymentComplete,
  action,
}: PaymentSimulationModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("processing");
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setStep("success");
    
    // Auto-close after success
    setTimeout(() => {
      onPaymentComplete();
      resetForm();
    }, 1500);
  };

  const resetForm = () => {
    setStep("form");
    setCardNumber("");
    setExpiry("");
    setCvc("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t("payment.title")}
              </DialogTitle>
              <DialogDescription>
                {action === "add" 
                  ? t("payment.addPickDescription")
                  : t("payment.changePickDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <span className="text-2xl font-bold text-foreground">1,00 €</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("payment.oneTimeFee")}
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    {t("payment.cardNumber")}
                  </label>
                  <Input
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">
                      {t("payment.expiry")}
                    </label>
                    <Input
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">
                      CVC
                    </label>
                    <Input
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      maxLength={3}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                🔒 {t("payment.securePayment")}
              </p>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="gradient">
                  {t("payment.pay")} 1,00 €
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
        
        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-foreground font-medium">{t("payment.processing")}</p>
            <p className="text-sm text-muted-foreground">{t("payment.pleaseWait")}</p>
          </div>
        )}
        
        {step === "success" && (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-foreground font-medium">{t("payment.success")}</p>
            <p className="text-sm text-muted-foreground">{t("payment.thankYou")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSimulationModal;
