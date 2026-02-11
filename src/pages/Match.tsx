import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, ArrowLeft, Phone, Mail, Copy, Check, Loader2, ShieldBan } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import Confetti from "@/components/Confetti";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Match = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { matches, loading: matchesLoading, refetch } = useMatches();
  const { blockUser, blocking } = useBlockedUsers();
  const [copied, setCopied] = useState<"phone" | "email" | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const match = matches.find(m => m.id === id);

  const handleCopy = (type: "phone" | "email", value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleBlock = async () => {
    if (!match || !user) return;
    const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
    const success = await blockUser(otherUserId, match.id);
    if (success) {
      refetch();
      navigate("/home");
    }
  };

  if (authLoading || matchesLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">{t("match.notFound")}</p>
        <Button onClick={() => navigate("/home")} variant="secondary">
          {t("match.backHome")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Confetti />
      
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/home")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              disabled={blocking}
            >
              <ShieldBan className="w-5 h-5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("block.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("block.confirmDescription", { name: match.other_user_name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBlock}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("block.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-3xl opacity-30 gradient-match rounded-full scale-150" />
          <div className="relative">
            <div className="w-28 h-28 rounded-full gradient-match flex items-center justify-center match-animation">
              <span className="text-4xl font-semibold text-primary-foreground">
                {match.other_user_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -top-2 -right-2 float-animation" style={{ animationDelay: "0.2s" }}>
              <Heart className="w-6 h-6 text-primary" fill="currentColor" />
            </div>
            <div className="absolute -bottom-1 -left-3 float-animation" style={{ animationDelay: "0.5s" }}>
              <Heart className="w-5 h-5 text-primary/70" fill="currentColor" />
            </div>
            <div className="absolute top-1/2 -right-4 float-animation" style={{ animationDelay: "0.8s" }}>
              <Sparkles className="w-5 h-5 text-primary/80" />
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-semibold gradient-text">{t("match.title")}</h1>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <p className="text-lg text-foreground mb-1">{match.other_user_name}</p>
          <p className="text-muted-foreground text-sm">{t("match.subtitle")}</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <p className="text-muted-foreground text-xs text-center mb-4">{t("match.contactNow")}</p>

          {match.other_user_phone && (
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Phone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("match.phone")}</p>
                <p className="text-foreground font-medium">{match.other_user_phone}</p>
              </div>
              <button
                onClick={() => handleCopy("phone", match.other_user_phone!)}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied === "phone" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {match.other_user_email && (
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("match.email")}</p>
                <p className="text-foreground font-medium">{match.other_user_email}</p>
              </div>
              <button
                onClick={() => handleCopy("email", match.other_user_email!)}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied === "email" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {!match.other_user_phone && !match.other_user_email && (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">{t("match.noContact")}</p>
            </div>
          )}
        </div>

        <p className="mt-10 text-xs text-muted-foreground/60 text-center max-w-xs">{t("match.tip")}</p>
      </div>

      <div className="p-6 pt-0">
        <Button onClick={() => navigate("/home")} variant="secondary" className="w-full" size="lg">
          {t("match.backHome")}
        </Button>
      </div>
    </div>
  );
};

export default Match;
