import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, Calendar, Clock, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePicks } from "@/hooks/usePicks";
import { toast } from "sonner";

const PickDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { picks, loading: picksLoading, deletePick } = usePicks();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const pick = picks.find(p => p.id === id);

  const handleDelete = async () => {
    if (!pick) return;
    setDeleting(true);
    const result = await deletePick(pick.id);
    if (result.success) {
      toast.success("Elección eliminada");
      navigate("/home");
    } else {
      toast.error(result.error || "Error al eliminar");
      setDeleting(false);
    }
  };

  if (authLoading || picksLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pick) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Elección no encontrada</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Esta elección no existe o fue eliminada.</p>
        </div>
      </div>
    );
  }

  const createdDate = new Date(pick.created_at);
  const formattedDate = createdDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = createdDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Detalle de elección</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-medium text-muted-foreground mb-4">
            {pick.picked_name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-semibold text-foreground">{pick.picked_name}</h2>
          <span className="mt-2 text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
            {pick.is_matched ? "¡Coincidencia!" : "En espera"}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Contact info */}
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-3">
              {pick.identifier_type === 'phone' ? (
                <Phone className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Mail className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {pick.identifier_type === 'phone' ? 'Número de teléfono' : 'Correo electrónico'}
                </p>
                <p className="text-foreground font-medium">{pick.picked_identifier}</p>
              </div>
            </div>
          </div>

          {/* Date added */}
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Fecha de creación</p>
                <p className="text-foreground font-medium">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* Time added */}
          <div className="bg-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Hora</p>
                <p className="text-foreground font-medium">{formattedTime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Delete button */}
        <div className="mt-8">
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar elección
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PickDetail;
