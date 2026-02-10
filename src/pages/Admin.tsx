import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Settings, Globe, Megaphone, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppConfigRow {
  id: string;
  app_mode: string;
  max_picks: number | "";
  free_changes_per_month: number | "";
  price_per_change: number | "";
  enabled: boolean;
}

interface GlobalConfigRow {
  id: string;
  max_new_users_per_day: number;
  enabled_languages: string[];
  enabled_countries: string[];
  promo_enabled: boolean;
  promo_start: string | null;
  promo_end: string | null;
  promo_max_picks_override: number | null;
  verify_mobile: boolean;
  verify_email: boolean;
  beta_mode: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const [appConfigs, setAppConfigs] = useState<AppConfigRow[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfigRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable state for global config
  const [globalForm, setGlobalForm] = useState({
    max_new_users_per_day: 0,
    enabled_languages: "",
    enabled_countries: "",
    promo_enabled: false,
    promo_start: "",
    promo_end: "",
    promo_max_picks_override: "",
    verify_mobile: false,
    verify_email: true,
    beta_mode: true,
  });

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/home");
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [modeRes, globalRes] = await Promise.all([
      supabase.from("app_config").select("*").order("app_mode"),
      supabase.from("global_config").select("*").limit(1).single(),
    ]);

    if (modeRes.data) setAppConfigs(modeRes.data as unknown as AppConfigRow[]);
    if (globalRes.data) {
      const g = globalRes.data as unknown as GlobalConfigRow;
      setGlobalConfig(g);
      setGlobalForm({
        max_new_users_per_day: g.max_new_users_per_day,
        enabled_languages: g.enabled_languages.join(", "),
        enabled_countries: g.enabled_countries.join(", "),
        promo_enabled: g.promo_enabled,
        promo_start: g.promo_start ? g.promo_start.slice(0, 16) : "",
        promo_end: g.promo_end ? g.promo_end.slice(0, 16) : "",
        promo_max_picks_override: g.promo_max_picks_override?.toString() ?? "",
        verify_mobile: g.verify_mobile,
        verify_email: g.verify_email,
        beta_mode: g.beta_mode,
      });
    }
    setLoading(false);
  };

  const updateAppConfig = async (config: AppConfigRow) => {
    setSaving(true);
    const { data, error } = await supabase
      .from("app_config")
      .update({
        max_picks: Number(config.max_picks) || 1,
        free_changes_per_month: Number(config.free_changes_per_month) || 0,
        price_per_change: Number(config.price_per_change) || 0,
        enabled: config.enabled,
      })
      .eq("id", config.id)
      .select();

    if (error) {
      console.error("Error updating app_config:", error);
      toast.error(`Error: ${error.message}`);
    } else if (!data || data.length === 0) {
      toast.error("No se pudo guardar. Verifica permisos de admin.");
    } else {
      toast.success(`${config.app_mode} actualizado`);
      await fetchAll();
    }
    setSaving(false);
  };

  const updateGlobalConfig = async () => {
    if (!globalConfig) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("global_config")
      .update({
        max_new_users_per_day: globalForm.max_new_users_per_day,
        enabled_languages: globalForm.enabled_languages.split(",").map((s) => s.trim()).filter(Boolean),
        enabled_countries: globalForm.enabled_countries.split(",").map((s) => s.trim()).filter(Boolean),
        promo_enabled: globalForm.promo_enabled,
        promo_start: globalForm.promo_start || null,
        promo_end: globalForm.promo_end || null,
        promo_max_picks_override: globalForm.promo_max_picks_override ? parseInt(globalForm.promo_max_picks_override) : null,
        verify_mobile: globalForm.verify_mobile,
        verify_email: globalForm.verify_email,
        beta_mode: globalForm.beta_mode,
      })
      .eq("id", globalConfig.id)
      .select();

    if (error) {
      console.error("Error updating global_config:", error);
      toast.error(`Error: ${error.message}`);
    } else if (!data || data.length === 0) {
      toast.error("No se pudo guardar. Verifica permisos de admin.");
    } else {
      toast.success("Configuración global guardada");
      await fetchAll();
    }
    setSaving(false);
  };

  const setAppField = (index: number, field: keyof AppConfigRow, value: any) => {
    setAppConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Panel
          </h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <Tabs defaultValue="modes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="modes" className="text-xs gap-1">
              <Users className="w-3.5 h-3.5" />
              Modos
            </TabsTrigger>
            <TabsTrigger value="global" className="text-xs gap-1">
              <Globe className="w-3.5 h-3.5" />
              Global
            </TabsTrigger>
            <TabsTrigger value="promo" className="text-xs gap-1">
              <Megaphone className="w-3.5 h-3.5" />
              Promo
            </TabsTrigger>
          </TabsList>

          {/* === MODES TAB === */}
          <TabsContent value="modes" className="space-y-6">
            {appConfigs.map((config, idx) => (
              <div key={config.id} className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground capitalize">{config.app_mode}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Activo</span>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(v) => setAppField(idx, "enabled", v)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Max picks</label>
                    <Input
                      type="number"
                      min={1}
                      value={config.max_picks}
                      onChange={(e) => setAppField(idx, "max_picks", e.target.value === "" ? "" : Number(e.target.value))}
                      onBlur={() => { if (config.max_picks === "" || isNaN(Number(config.max_picks))) setAppField(idx, "max_picks", 1); }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Cambios gratis/mes</label>
                    <Input
                      type="number"
                      min={0}
                      value={config.free_changes_per_month}
                      onChange={(e) => setAppField(idx, "free_changes_per_month", e.target.value === "" ? "" : Number(e.target.value))}
                      onBlur={() => { if (config.free_changes_per_month === "" || isNaN(Number(config.free_changes_per_month))) setAppField(idx, "free_changes_per_month", 0); }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Precio/cambio (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={config.price_per_change}
                      onChange={(e) => setAppField(idx, "price_per_change", e.target.value === "" ? "" : Number(e.target.value))}
                      onBlur={() => { if (config.price_per_change === "" || isNaN(Number(config.price_per_change))) setAppField(idx, "price_per_change", 0); }}
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => updateAppConfig(config)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Guardar {config.app_mode}</>}
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* === GLOBAL TAB === */}
          <TabsContent value="global" className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-base font-semibold text-foreground">Configuración Global</h3>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nuevos usuarios/día (0 = sin límite)</label>
                <Input
                  type="number"
                  min={0}
                  value={globalForm.max_new_users_per_day}
                  onChange={(e) => setGlobalForm((p) => ({ ...p, max_new_users_per_day: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Idiomas habilitados (separados por coma)</label>
                <Input
                  value={globalForm.enabled_languages}
                  onChange={(e) => setGlobalForm((p) => ({ ...p, enabled_languages: e.target.value }))}
                  placeholder="es, en, eu"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Países habilitados (separados por coma)</label>
                <Input
                  value={globalForm.enabled_countries}
                  onChange={(e) => setGlobalForm((p) => ({ ...p, enabled_countries: e.target.value }))}
                  placeholder="ES, FR"
                />
              </div>

              {/* Beta & Verification toggles */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <h4 className="text-sm font-medium text-foreground">Pagos y Verificaciones</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-foreground">Modo Beta (sin pagos)</span>
                    <p className="text-xs text-muted-foreground">Desactiva todos los cobros por cambio de pick</p>
                  </div>
                  <Switch
                    checked={globalForm.beta_mode}
                    onCheckedChange={(v) => setGlobalForm((p) => ({ ...p, beta_mode: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-foreground">Verificar móvil (SMS)</span>
                    <p className="text-xs text-muted-foreground">Requiere código OTP al registrarse</p>
                  </div>
                  <Switch
                    checked={globalForm.verify_mobile}
                    onCheckedChange={(v) => setGlobalForm((p) => ({ ...p, verify_mobile: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-foreground">Verificar email</span>
                    <p className="text-xs text-muted-foreground">Envía enlace de verificación al registrarse</p>
                  </div>
                  <Switch
                    checked={globalForm.verify_email}
                    onCheckedChange={(v) => setGlobalForm((p) => ({ ...p, verify_email: v }))}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={updateGlobalConfig} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Guardar configuración global</>}
              </Button>
            </div>
          </TabsContent>

          {/* === PROMO TAB === */}
          <TabsContent value="promo" className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Modo Promoción</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Activa</span>
                  <Switch
                    checked={globalForm.promo_enabled}
                    onCheckedChange={(v) => setGlobalForm((p) => ({ ...p, promo_enabled: v }))}
                  />
                </div>
              </div>

              {globalForm.promo_enabled && (
                <div className="space-y-3 animate-fade-in-up">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Inicio promo</label>
                    <Input
                      type="datetime-local"
                      value={globalForm.promo_start}
                      onChange={(e) => setGlobalForm((p) => ({ ...p, promo_start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fin promo</label>
                    <Input
                      type="datetime-local"
                      value={globalForm.promo_end}
                      onChange={(e) => setGlobalForm((p) => ({ ...p, promo_end: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Override max picks (durante promo)</label>
                    <Input
                      type="number"
                      min={1}
                      value={globalForm.promo_max_picks_override}
                      onChange={(e) => setGlobalForm((p) => ({ ...p, promo_max_picks_override: e.target.value }))}
                      placeholder="ej: 5"
                    />
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={updateGlobalConfig} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> Guardar promo</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
