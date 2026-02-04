import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface PhoneVerificationProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const PhoneVerification = ({ phone, onVerified, onBack }: PhoneVerificationProps) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error(t("auth.otpIncomplete"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (data.valid) {
        toast.success(t("auth.phoneVerified"));
        onVerified();
      } else {
        toast.error(data.error || t("auth.invalidOtp"));
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error(t("auth.verificationError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t("auth.otpResent"));
        setOtp("");
      } else {
        toast.error(data.error || t("auth.sendOtpError"));
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error(t("auth.sendOtpError"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6 animate-fade-in-up">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back")}
      </button>

      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">{t("auth.verifyPhone")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.otpSentTo")} <span className="font-medium text-foreground">{phone}</span>
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          disabled={loading}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button
        onClick={handleVerify}
        className="w-full"
        size="lg"
        disabled={loading || otp.length !== 6}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          t("auth.verifyCode")
        )}
      </Button>

      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {resending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("auth.resending")}
            </span>
          ) : (
            t("auth.resendOtp")
          )}
        </button>
      </div>
    </div>
  );
};

export default PhoneVerification;
