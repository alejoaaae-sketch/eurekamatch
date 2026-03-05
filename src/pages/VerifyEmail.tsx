import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token no proporcionado.");
    }
  }, [token]);

  const handleVerify = async () => {
    if (!token) return;
    setStatus("loading");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();

      if (data.status === "success") {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.message || "Error de verificación.");
      }
    } catch {
      setStatus("error");
      setMessage("Ha ocurrido un error. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
        {status === "idle" && token && (
          <>
            <div className="text-6xl mb-6">✉️</div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Verificar tu email</h1>
            <p className="text-muted-foreground mb-6">
              Haz clic en el botón de abajo para confirmar tu dirección de correo electrónico.
            </p>
            <button
              onClick={handleVerify}
              className="inline-block bg-gradient-to-r from-pink-400 to-rose-600 text-white font-semibold px-8 py-3 rounded-full text-lg hover:opacity-90 transition-opacity"
            >
              Confirmar verificación ✓
            </button>
          </>
        )}

        {status === "loading" && (
          <>
            <div className="text-6xl mb-6">✉️</div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Verificando...</h1>
            <div className="w-8 h-8 border-3 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-2xl font-bold text-green-500 mb-4">¡Email verificado!</h1>
            <p className="text-muted-foreground mb-6">
              {message} Ya puedes recibir notificaciones de match.
            </p>
            <a
              href="https://eurekamatch.com"
              className="inline-block bg-gradient-to-r from-pink-400 to-rose-600 text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Abrir Mútuo
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error de verificación</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <a
              href="https://eurekamatch.com"
              className="inline-block bg-gradient-to-r from-pink-400 to-rose-600 text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Abrir Mútuo
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
