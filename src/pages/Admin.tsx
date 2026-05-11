import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';

interface AdminStats {
  buildsTotal: number;
  buildsLast30: number;
  feedback: { up: number; down: number; ratio: number | null };
  recentBuilds: Array<{
    id: string;
    prompt: string;
    status: string;
    qa_score: number | null;
    security_score: number | null;
    created_at: string;
  }>;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.email) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/admin/stats?email=${encodeURIComponent(user.email)}`)
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
        return data as AdminStats;
      })
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center">
        <div className="text-sm text-zinc-400">Loading admin dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/builder')}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Retour au builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/builder')}
            className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h1 className="text-base font-bold">Huggy — Admin Dashboard</h1>
        </div>
        <span className="text-[10px] text-zinc-500">Connecté en tant que {user?.email}</span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Activity className="w-4 h-4 text-blue-400" />}
            label="Total builds"
            value={stats?.buildsTotal ?? 0}
          />
          <KpiCard
            icon={<Clock className="w-4 h-4 text-violet-400" />}
            label="Builds (30j)"
            value={stats?.buildsLast30 ?? 0}
          />
          <KpiCard
            icon={<ThumbsUp className="w-4 h-4 text-green-400" />}
            label="👍 (30j)"
            value={stats?.feedback.up ?? 0}
            sublabel={stats?.feedback.ratio != null ? `${stats.feedback.ratio}% positif` : '—'}
          />
          <KpiCard
            icon={<ThumbsDown className="w-4 h-4 text-red-400" />}
            label="👎 (30j)"
            value={stats?.feedback.down ?? 0}
          />
        </div>

        {/* Recent builds */}
        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Builds récents (20)</h2>
          {stats?.recentBuilds.length === 0 && (
            <p className="text-xs text-zinc-500 py-4 text-center">Aucun build enregistré.</p>
          )}
          <div className="flex flex-col gap-2">
            {stats?.recentBuilds.map(b => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60"
              >
                {b.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 line-clamp-1">{b.prompt || '(sans prompt)'}</p>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-1">
                    <span>{new Date(b.created_at).toLocaleString()}</span>
                    {b.qa_score != null && <span>QA {b.qa_score}</span>}
                    {b.security_score != null && <span>Sec {b.security_score}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-100">{value.toLocaleString()}</p>
      {sublabel && <p className="text-[10px] text-zinc-500 mt-1">{sublabel}</p>}
    </div>
  );
}
