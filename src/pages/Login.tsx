import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Eye, EyeOff, Loader2, Phone, User, Mail, Users, Flame, Handshake } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LanguageSelector from "@/components/LanguageSelector";
import LegalFooter from "@/components/LegalFooter";

import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { toast } from "sonner";
import { useAppConfig } from "@/hooks/useAppConfig";
import { getAppConfig, AppType } from "@/config/app.config";

type LoginStep = "form";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const appType = (searchParams.get('app') as AppType) || 'love';
  const config = getAppConfig(appType);
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { verifyEmail } = useAppConfig();
  const [step] = useState<LoginStep>("form");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/home");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate phone
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    if (cleanPhone.length < 9) {
      toast.error(t("auth.phoneInvalid"));
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await signIn(phone, password);
        if (error) {
          toast.error(error.message === "Invalid login credentials" 
            ? t("auth.invalidCredentials")
            : error.message);
        } else {
          toast.success(t("auth.welcomeBack"));
          navigate("/home");
        }
      } else {
        // Registration flow - validate fields first
        // Enhanced password policy: minimum 8 characters
        if (password.length < 8) {
          toast.error(t("auth.passwordMinLength"));
          setLoading(false);
          return;
        }
        // Check for at least one uppercase, one lowercase, and one number
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (!hasUppercase || !hasLowercase || !hasNumber) {
          toast.error(t("auth.passwordComplexity"));
          setLoading(false);
          return;
        }
        if (!displayName.trim()) {
          toast.error(t("auth.nameRequired"));
          setLoading(false);
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email.trim())) {
          toast.error(t("auth.emailInvalid"));
          setLoading(false);
          return;
        }

        // Skip mobile verification during registration - it will happen when creating first pick
        await handlePhoneVerified();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerified = async () => {
    setLoading(true);
    try {
      const { error } = await signUp(phone, password, displayName.trim(), email.trim(), verifyEmail);
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error(t("auth.phoneAlreadyRegistered"));
        } else {
          toast.error(error.message);
        }
        // Stay on form
      } else {
        toast.success(t("auth.accountCreated"));
        navigate("/home");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      {/* Language Selector */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      {/* Logo */}
      <div className="mb-12 animate-fade-in-up">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl float-animation bg-gradient-to-br ${
          appType === 'love' ? 'from-rose-500 to-pink-500' :
          appType === 'plan' ? 'from-orange-500 to-amber-500' :
          appType === 'mude' ? 'from-red-600 to-rose-500' :
          'from-teal-500 to-cyan-500'
        } text-white`}>
          {appType === 'love' && <Heart className="w-10 h-10" fill="currentColor" />}
          {appType === 'plan' && <Users className="w-10 h-10" />}
          {appType === 'mude' && <Flame className="w-10 h-10" fill="currentColor" />}
          {appType === 'colab' && <Handshake className="w-10 h-10" />}
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-10 animate-fade-in-up animate-delay-100">
        <h1 className="text-3xl font-semibold text-foreground mb-2">{config.appName}</h1>
        <p className="text-muted-foreground text-sm">
          {t("app.tagline")}
        </p>
      </div>

      {step === "form" && (
        <>
          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-fade-in-up animate-delay-200">
            {/* Name field - only show on signup */}
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("auth.name")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLogin}
                  disabled={loading}
                  className="pl-12"
                />
              </div>
            )}

            {/* Email field - only show on signup */}
            {!isLogin && (
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t("auth.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!isLogin}
                    disabled={loading}
                    className="pl-12"
                  />
                </div>
                <p className="text-xs text-muted-foreground/70 px-1">
                  {t("auth.emailHint")}
                </p>
              </div>
            )}

            {/* Phone field */}
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="tel"
                placeholder={t("auth.phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
                className="pl-12"
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password strength indicator - only show during signup */}
            {!isLogin && <PasswordStrengthIndicator password={password} />}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                t("auth.login")
              ) : (
                t("auth.signup")
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-8 text-center animate-fade-in-up animate-delay-300">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
              disabled={loading}
            >
              {isLogin ? (
                <>{t("auth.noAccount")} <span className="text-primary">{t("auth.register")}</span></>
              ) : (
                <>{t("auth.hasAccount")} <span className="text-primary">{t("auth.signIn")}</span></>
              )}
            </button>
          </div>
        </>
      )}

      {/* Legal links */}
      <div className="mt-6 animate-fade-in-up animate-delay-300">
        <LegalFooter />
      </div>

      {/* Privacy note */}
      <p className="mt-4 text-xs text-muted-foreground/60 text-center max-w-xs animate-fade-in-up animate-delay-300">
        {t("app.privacyNote")}
      </p>
    </div>
  );
};

export default Login;
