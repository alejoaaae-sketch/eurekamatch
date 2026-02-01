import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, MoreVertical } from "lucide-react";
import { appConfig } from "@/config/app.config";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">¡App instalada!</CardTitle>
            <CardDescription>
              Ya puedes usar {appConfig.appName} desde tu pantalla de inicio
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => window.location.href = "/login"}
              style={{ backgroundColor: appConfig.primaryColor }}
              className="w-full"
            >
              Abrir la app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div 
            className="mx-auto mb-4 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: `${appConfig.primaryColor}20` }}
          >
            <Smartphone className="w-10 h-10" style={{ color: appConfig.primaryColor }} />
          </div>
          <CardTitle className="text-2xl">{appConfig.appName}</CardTitle>
          <CardDescription className="text-base">
            {appConfig.tagline}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isIOS ? (
            // iOS Installation Instructions
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Para instalar en iPhone/iPad:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Pulsa el botón <Share className="inline w-4 h-4" /> Compartir</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Selecciona "Añadir a pantalla de inicio"</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Pulsa "Añadir" para confirmar</p>
                  </div>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            // Android/Desktop with install prompt available
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Instala la app en tu dispositivo para acceso rápido
              </p>
              <Button
                onClick={handleInstall}
                className="w-full h-12 text-base"
                style={{ backgroundColor: appConfig.primaryColor }}
              >
                <Download className="mr-2 h-5 w-5" />
                Instalar app
              </Button>
            </div>
          ) : (
            // Android without prompt (instructions)
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Para instalar en Android:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Pulsa el menú <MoreVertical className="inline w-4 h-4" /> del navegador</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Selecciona "Instalar app" o "Añadir a inicio"</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => window.location.href = "/login"}
            >
              Continuar en el navegador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
