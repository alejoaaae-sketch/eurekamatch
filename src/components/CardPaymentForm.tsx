import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  PayPalScriptProvider,
  PayPalCardFieldsProvider,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Lock } from "lucide-react";
import type { PickPack } from "@/hooks/usePickBalance";

const PAYPAL_CLIENT_ID = "AZBkyj7Skp7RvrLxT-M2dXi-g9OtZ9TIpsZnucT4bn2PzhsI5q5L1FGqprcZnkbLiUqCYK0I7bGFkvNT";
const POLL_INTERVAL = 3000; // 3 seconds
const POLL_MAX_ATTEMPTS = 40; // 2 minutes max

interface CardPaymentFormProps {
  pack: PickPack;
  onSuccess: (picksAdded: number) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

function SubmitButton({
  pack,
  isProcessing,
  onSubmit,
}: {
  pack: PickPack;
  isProcessing: boolean;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const { cardFieldsForm } = usePayPalCardFields();

  const handleClick = async () => {
    if (!cardFieldsForm || isProcessing) return;
    const formState = await cardFieldsForm.getState();
    if (!formState.isFormValid) return;

    // Notify parent to start polling
    onSubmit();

    // Fire submit (triggers 3DS) - don't await, it may never resolve
    cardFieldsForm.submit().then((result) => {
      console.log("CardFields submit resolved:", result);
    }).catch((err) => {
      console.warn("CardFields submit error (may be normal after 3DS):", err);
    });
  };

  return (
    <Button
      variant="gradient"
      className="w-full mt-4"
      onClick={handleClick}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Lock className="w-4 h-4 mr-2" />
      )}
      {isProcessing
        ? t("payment.processing")
        : `${t("payment.pay")} ${Number(pack.price).toFixed(2)} €`}
    </Button>
  );
}

const CardPaymentForm = ({ pack, onSuccess, onError, onCancel }: CardPaymentFormProps) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);
  const capturedRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const captureOrder = useCallback(async (orderId: string) => {
    if (capturedRef.current) return;
    
    console.log("Attempting capture for order:", orderId);
    try {
      const { data, error } = await supabase.functions.invoke("capture-paypal-order", {
        body: { orderId },
      });

      if (error) {
        console.log("Capture invoke error:", error);
        return false;
      }

      console.log("Capture response:", data);

      if (data?.success) {
        capturedRef.current = true;
        stopPolling();
        setIsProcessing(false);
        onSuccess(data.picks_added || 0);
        return true;
      }

      if (data?.error?.includes("not in capturable state")) {
        // Order not yet approved (3DS still in progress), keep polling
        return false;
      }

      // Actual error
      capturedRef.current = true;
      stopPolling();
      setIsProcessing(false);
      onError(data?.error || "Payment failed");
      return true;
    } catch (err) {
      console.error("Capture error:", err);
      return false;
    }
  }, [onSuccess, onError, stopPolling]);

  const startPolling = useCallback((orderId: string) => {
    attemptRef.current = 0;
    capturedRef.current = false;

    // First attempt after a short delay (give 3DS time to start)
    pollingRef.current = setInterval(async () => {
      attemptRef.current += 1;
      console.log(`Poll attempt ${attemptRef.current} for order ${orderId}`);

      if (attemptRef.current > POLL_MAX_ATTEMPTS) {
        stopPolling();
        setIsProcessing(false);
        onError("Payment timeout. Please try again.");
        return;
      }

      await captureOrder(orderId);
    }, POLL_INTERVAL);
  }, [captureOrder, stopPolling, onError]);

  const createOrder = async () => {
    const { data, error } = await supabase.functions.invoke("create-paypal-order", {
      body: {
        packName: pack.name,
        packId: pack.id,
        picksCount: pack.picks_count,
        price: pack.price,
      },
    });

    if (error || !data?.orderId) {
      throw new Error("Failed to create order");
    }

    console.log("Order created:", data.orderId);
    setCurrentOrderId(data.orderId);
    return data.orderId;
  };

  const handleSubmit = () => {
    if (!currentOrderId) {
      console.error("No order ID when submitting");
      return;
    }
    setIsProcessing(true);
    startPolling(currentOrderId);
  };

  // onApprove as fallback — if the SDK does fire it, capture immediately
  const onApprove = async (data: { orderID: string }) => {
    console.log("onApprove fired:", data.orderID);
    stopPolling();
    await captureOrder(data.orderID);
  };

  const onErrorHandler = (err: Record<string, unknown>) => {
    console.error("PayPal card error:", err);
    stopPolling();
    setIsProcessing(false);
    onError(t("common.error"));
  };

  const fieldStyle = {
    input: {
      "font-size": "16px",
      "font-family": "inherit",
      "color": "#1a1a1a",
      "padding": "12px",
    },
    ".invalid": {
      "color": "#dc2626",
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium text-foreground text-sm">
          {t("payment.cardDetails")}
        </span>
      </div>

      <PayPalScriptProvider
        options={{
          clientId: PAYPAL_CLIENT_ID,
          currency: "EUR",
          intent: "capture",
          components: "card-fields",
        }}
      >
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onErrorHandler}
          style={fieldStyle}
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-background overflow-hidden">
              <PayPalNumberField className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                <PayPalExpiryField className="w-full" />
              </div>
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                <PayPalCVVField className="w-full" />
              </div>
            </div>
          </div>

          <SubmitButton pack={pack} isProcessing={isProcessing} onSubmit={handleSubmit} />
        </PayPalCardFieldsProvider>
      </PayPalScriptProvider>

      {isProcessing && (
        <p className="text-xs text-center text-muted-foreground animate-pulse">
          {t("payment.processing")}... {t("payment.pleaseWait")}
        </p>
      )}

      {!isProcessing && (
        <button
          onClick={onCancel}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          {t("common.cancel")}
        </button>
      )}
    </div>
  );
};

export default CardPaymentForm;
