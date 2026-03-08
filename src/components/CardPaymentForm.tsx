import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  PayPalScriptProvider,
  PayPalCardFieldsProvider,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  PayPalCardFieldsForm,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Lock } from "lucide-react";
import type { PickPack } from "@/hooks/usePickBalance";

const PAYPAL_CLIENT_ID = "AZBkyj7Skp7RvrLxT-M2dXi-g9OtZ9TIpsZnucT4bn2PzhsI5q5L1FGqprcZnkbLiUqCYK0I7bGFkvNT";

interface CardPaymentFormProps {
  pack: PickPack;
  onSuccess: (picksAdded: number) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

function SubmitButton({ pack, isPaying }: { pack: PickPack; isPaying: boolean }) {
  const { t } = useTranslation();
  const { cardFieldsForm } = usePayPalCardFields();

  const handleClick = async () => {
    if (!cardFieldsForm) return;
    const formState = await cardFieldsForm.getState();
    if (!formState.isFormValid) return;
    cardFieldsForm.submit();
  };

  return (
    <Button
      variant="gradient"
      className="w-full mt-4"
      onClick={handleClick}
      disabled={isPaying}
    >
      {isPaying ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Lock className="w-4 h-4 mr-2" />
      )}
      {t("payment.pay")} {Number(pack.price).toFixed(2)} €
    </Button>
  );
}

const CardPaymentForm = ({ pack, onSuccess, onError, onCancel }: CardPaymentFormProps) => {
  const { t } = useTranslation();
  const [isPaying, setIsPaying] = useState(false);

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

    return data.orderId;
  };

  const onApprove = async (data: { orderID: string }) => {
    setIsPaying(true);
    try {
      const { data: captureData, error } = await supabase.functions.invoke("capture-paypal-order", {
        body: { orderId: data.orderID },
      });

      if (error) throw error;

      if (captureData?.success) {
        onSuccess(captureData.picks_added || 0);
      } else {
        onError(captureData?.error || "Payment failed");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment error");
    } finally {
      setIsPaying(false);
    }
  };

  const onErrorHandler = (err: Record<string, unknown>) => {
    console.error("PayPal card error:", err);
    onError(t("common.error"));
    setIsPaying(false);
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

          <SubmitButton pack={pack} isPaying={isPaying} />
        </PayPalCardFieldsProvider>
      </PayPalScriptProvider>

      <button
        onClick={onCancel}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        {t("common.cancel")}
      </button>
    </div>
  );
};

export default CardPaymentForm;
