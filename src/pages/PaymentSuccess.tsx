import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [picksAdded, setPicksAdded] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!user) return;

      const provider = searchParams.get("provider");

      try {
        if (provider === "paypal") {
          // PayPal flow: capture the order using the token (order ID)
          const token = searchParams.get("token");
          if (!token) {
            setStatus("error");
            setErrorMsg("No PayPal order token");
            return;
          }

          const { data, error } = await supabase.functions.invoke("capture-paypal-order", {
            body: { orderId: token },
          });

          if (error) throw error;
          if (data?.success) {
            setPicksAdded(data.picks_added || 0);
            setStatus("success");
          } else {
            setStatus("error");
            setErrorMsg(data?.error || "Verification failed");
          }
        } else {
          // Stripe flow (legacy)
          const sessionId = searchParams.get("session_id");
          if (!sessionId) {
            setStatus("error");
            setErrorMsg("No session ID");
            return;
          }

          const { data, error } = await supabase.functions.invoke("verify-payment", {
            body: { sessionId },
          });

          if (error) throw error;
          if (data?.success) {
            setPicksAdded(data.picks_added || 0);
            setStatus("success");
          } else {
            setStatus("error");
            setErrorMsg(data?.error || "Verification failed");
          }
        }
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Error");
      }
    };

    if (!authLoading && user) {
      verifyPayment();
    }
  }, [user, authLoading, searchParams]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground font-medium">{t("payment.processing")}</p>
            <p className="text-sm text-muted-foreground">{t("payment.pleaseWait")}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-xl font-bold text-foreground mb-2">{t("payment.success")}</p>
            <p className="text-muted-foreground mb-6">
              {picksAdded > 0
                ? t("packs.purchaseSuccess", { count: picksAdded })
                : t("payment.thankYou")}
            </p>
            <Button variant="gradient" className="w-full" onClick={() => navigate("/home")}>
              {t("common.continue")}
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-xl font-bold text-foreground mb-2">{t("common.error")}</p>
            <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/buy-packs")}>
              {t("common.back")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
