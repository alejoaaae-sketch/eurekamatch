import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Eye, EyeOff, Loader2, Phone, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import LanguageSelector from "@/components/LanguageSelector";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        if (password.length < 6) {
          toast.error(t("auth.passwordMinLength"));
          setLoading(false);
          return;
        }
        if (!displayName.trim()) {
          toast.error(t("auth.nameRequired"));
          setLoading(false);
          return;
        }
        const { error } = await signUp(phone, password, displayName.trim());
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error(t("auth.phoneAlreadyRegistered"));
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(t("auth.accountCreated"));
          navigate("/home");
        }
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
        <div className="w-20 h-20 rounded-full gradient-match flex items-center justify-center glow-primary float-animation">
          <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-10 animate-fade-in-up animate-delay-100">
        <h1 className="text-3xl font-semibold text-foreground mb-2">{t("app.name")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("app.tagline")}
        </p>
      </div>

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

      {/* Privacy note */}
      <p className="mt-12 text-xs text-muted-foreground/60 text-center max-w-xs animate-fade-in-up animate-delay-300">
        {t("app.privacyNote")}
      </p>
    </div>
  );
};

export default Login;
