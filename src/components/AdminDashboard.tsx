import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Heart, Sparkles, Euro, Activity, Bell, TrendingUp, CreditCard } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Totals {
  total_users: number;
  new_users_today: number;
  new_users_7d: number;
  new_users_30d: number;
  total_picks: number;
  matched_picks: number;
  total_matches: number;
  matches_7d: number;
  matches_30d: number;
  active_users_24h: number;
  active_users_7d: number;
  active_users_30d: number;
  total_revenue: number;
  revenue_30d: number;
  total_purchases: number;
  total_credits_granted: number;
  total_credits_used: number;
  total_notifications: number;
  notifications_30d: number;
}

interface DashboardData {
  totals: Totals;
  per_app: { app_mode: string; picks: number; matched: number; users: number }[];
  signups_daily: { date: string; count: number }[];
  picks_daily: { date: string; count: number }[];
  matches_daily: { date: string; count: number }[];
  lang_dist: { language: string; count: number }[];
  recent_purchases: {
    pack_name: string;
    price: number;
    picks_count: number;
    payment_method: string;
    created_at: string;
  }[];
}

const APP_COLORS: Record<string, string> = {
  love: "hsl(340 82% 60%)",
  friends: "hsl(28 95% 60%)",
  sex: "hsl(0 85% 60%)",
  hobby: "hsl(145 65% 50%)",
};

const PIE_COLORS = [
  "hsl(220 90% 60%)",
  "hsl(160 75% 50%)",
  "hsl(45 95% 60%)",
  "hsl(280 75% 60%)",
  "hsl(0 80% 60%)",
  "hsl(190 80% 55%)",
  "hsl(320 75% 60%)",
  "hsl(100 65% 55%)",
];

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = "primary",
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "primary" | "pink" | "green" | "orange" | "blue";
}) => {
  const tone =
    accent === "pink"
      ? "text-pink-400"
      : accent === "green"
      ? "text-emerald-400"
      : accent === "orange"
      ? "text-orange-400"
      : accent === "blue"
      ? "text-blue-400"
      : "text-primary";
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`w-4 h-4 ${tone}`} />
      </div>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
};

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="glass-card p-4">
    <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  </div>
);

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(240 10% 10%)",
    border: "1px solid hsl(240 10% 20%)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "hsl(0 0% 90%)" },
};

const formatDate = (s: string) => {
  const d = new Date(s);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const AdminDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_admin_dashboard_stats" as any);
      if (error) {
        setError(error.message);
      } else {
        setData(data as unknown as DashboardData);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-5 text-sm text-destructive">
        Error cargando dashboard: {error || "sin datos"}
      </div>
    );
  }

  const t = data.totals;
  const matchRate =
    t.total_picks > 0 ? ((t.matched_picks / t.total_picks) * 100).toFixed(1) : "0";
  const usageRate =
    t.total_credits_granted > 0
      ? ((t.total_credits_used / t.total_credits_granted) * 100).toFixed(1)
      : "0";

  const signups = data.signups_daily.map((d) => ({ ...d, date: formatDate(d.date) }));
  const picks = data.picks_daily.map((d) => ({ ...d, date: formatDate(d.date) }));
  const matches = data.matches_daily.map((d) => ({ ...d, date: formatDate(d.date) }));

  const perAppForChart = data.per_app.map((a) => ({
    ...a,
    fill: APP_COLORS[a.app_mode] || "hsl(220 90% 60%)",
  }));

  return (
    <div className="space-y-4">
      {/* USERS */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Usuarios
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Total usuarios" value={t.total_users} accent="blue" />
          <StatCard
            icon={TrendingUp}
            label="Nuevos hoy"
            value={t.new_users_today}
            sub={`${t.new_users_7d} en 7d · ${t.new_users_30d} en 30d`}
            accent="green"
          />
          <StatCard
            icon={Activity}
            label="Activos 24h"
            value={t.active_users_24h}
            sub={`${t.active_users_7d} en 7d · ${t.active_users_30d} en 30d`}
            accent="orange"
          />
          <StatCard
            icon={Bell}
            label="Notificaciones SMS"
            value={t.total_notifications}
            sub={`${t.notifications_30d} en 30d`}
          />
        </div>
      </div>

      {/* ENGAGEMENT */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Engagement
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Heart} label="Picks activos" value={t.total_picks} accent="pink" />
          <StatCard
            icon={Sparkles}
            label="Matches totales"
            value={t.total_matches}
            sub={`${t.matches_7d} en 7d · ${t.matches_30d} en 30d`}
            accent="pink"
          />
          <StatCard
            icon={TrendingUp}
            label="Match rate"
            value={`${matchRate}%`}
            sub={`${t.matched_picks} picks con match`}
            accent="green"
          />
          <StatCard
            icon={CreditCard}
            label="Créditos usados"
            value={`${usageRate}%`}
            sub={`${t.total_credits_used} / ${t.total_credits_granted}`}
          />
        </div>
      </div>

      {/* REVENUE */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Ingresos
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Euro}
            label="Ingresos totales"
            value={`€${Number(t.total_revenue).toFixed(2)}`}
            accent="green"
          />
          <StatCard
            icon={Euro}
            label="Ingresos 30d"
            value={`€${Number(t.revenue_30d).toFixed(2)}`}
            sub={`${t.total_purchases} compras totales`}
            accent="green"
          />
        </div>
      </div>

      {/* CHARTS */}
      <ChartCard title="Nuevos usuarios (30 días)">
        <LineChart data={signups}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 20%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(220 90% 60%)"
            strokeWidth={2}
            dot={false}
            name="Signups"
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Picks creados (30 días)">
        <LineChart data={picks}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 20%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(340 82% 60%)"
            strokeWidth={2}
            dot={false}
            name="Picks"
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Matches (30 días)">
        <LineChart data={matches}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 20%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(145 65% 50%)"
            strokeWidth={2}
            dot={false}
            name="Matches"
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Picks por app">
        <BarChart data={perAppForChart}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 20%)" />
          <XAxis dataKey="app_mode" tick={{ fontSize: 11, fill: "hsl(0 0% 70%)" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="picks" name="Picks" fill="hsl(220 90% 60%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="matched" name="Matched" fill="hsl(145 65% 50%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="users" name="Usuarios" fill="hsl(340 82% 60%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      {data.lang_dist.length > 0 && (
        <ChartCard title="Idioma de los usuarios">
          <PieChart>
            <Pie
              data={data.lang_dist}
              dataKey="count"
              nameKey="language"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={(entry) => `${entry.language} (${entry.count})`}
              labelLine={false}
              style={{ fontSize: 11 }}
            >
              {data.lang_dist.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ChartCard>
      )}

      {/* RECENT PURCHASES */}
      {data.recent_purchases.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Últimas compras</h4>
          <div className="space-y-2">
            {data.recent_purchases.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs border-b border-border/40 pb-2 last:border-0"
              >
                <div>
                  <div className="text-foreground font-medium">{p.pack_name}</div>
                  <div className="text-muted-foreground">
                    {p.picks_count} créditos · {p.payment_method}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-foreground font-semibold">
                    €{Number(p.price).toFixed(2)}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
