import React, { useState } from 'react';
import api from '../../utils/axios';
import { useAiRecommendations, useApplyAiRecommendation } from '../../hooks/useAiRecommendations';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  Sparkles, CheckCircle2, ArrowRightLeft, TrendingUp, AlertOctagon,
  RefreshCw, UserCheck, Zap, ChevronRight, Bot, ShieldAlert, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const typeConfig = {
  reassignment: {
    label: 'Reassignment',
    icon: UserCheck,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    badge: 'primary',
  },
  priority_change: {
    label: 'Priority Change',
    icon: TrendingUp,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    badge: 'warning',
  },
  escalation: {
    label: 'Escalation',
    icon: AlertOctagon,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    badge: 'danger',
  },
  troubleshooting: {
    label: 'Troubleshooting',
    icon: Zap,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    badge: 'cyan',
  },
  similar_tickets: {
    label: 'Similar Tickets',
    icon: ArrowRightLeft,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    badge: 'purple',
  },
};

const ConfidenceBar = ({ confidence }) => {
  const pct = parseFloat(confidence) || 0;
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  );
};

const AIRecommendations = () => {
  const [applying, setApplying] = useState(null);

  // Use TanStack Query with 30-minute staleTime for expensive AI recommendations
  const { data: recommendations = [], isLoading: loading, isFetching: refreshing, refetch } = useAiRecommendations();
  const applyMutation = useApplyAiRecommendation();

  const fetchRecs = () => refetch();

  const handleApply = async (rec) => {
    const result = await Swal.fire({
      title: 'Apply AI Suggestion?',
      html: `<p class="text-sm text-slate-300">${rec.suggestion}</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Apply',
      cancelButtonText: 'Cancel',
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonColor: '#0891b2',
      cancelButtonColor: '#475569',
    });

    if (!result.isConfirmed) return;

    setApplying(rec.id);
    try {
      await applyMutation.mutateAsync(rec.id);
    } catch (e) {
      // toast notification handled by mutation hook
    } finally {
      setApplying(null);
    }
  };

  if (loading) return <Loader text="Analyzing AI recommendation models..." />;

  const grouped = recommendations.reduce((acc, rec) => {
    const t = rec.type || 'other';
    if (!acc[t]) acc[t] = [];
    acc[t].push(rec);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white font-display">AI Recommendations & Insights</h1>
          </div>
          <p className="text-xs text-slate-400">
            Rules-based engine analyzing active tickets for workload balancing, SLA compliance, and escalation triggers.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={refreshing ? null : RefreshCw}
          onClick={() => fetchRecs(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <span className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Refreshing...</span>
          ) : 'Refresh Analysis'}
        </Button>
      </div>

      {/* Summary Bar */}
      {recommendations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(typeConfig).map(([key, cfg]) => {
            const count = (grouped[key] || []).length;
            if (!count) return null;
            const Icon = cfg.icon;
            return (
              <Card key={key} className={`p-3 flex items-center gap-2 border ${cfg.bg}`}>
                <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">{cfg.label}</p>
                  <p className={`text-lg font-bold font-mono leading-none ${cfg.color}`}>{count}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <Card className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-cyan-400 opacity-60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">All Systems Nominal</p>
            <p className="text-xs text-slate-400 mt-0.5">No active recommendations. All tickets are well-managed.</p>
          </div>
          <button
            onClick={() => fetchRecs(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Run analysis again
          </button>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(typeConfig).map(([key, cfg]) => {
            const recs = grouped[key];
            if (!recs || recs.length === 0) return null;
            const Icon = cfg.icon;
            return (
              <div key={key} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-white font-display">{cfg.label}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} border ${cfg.color}`}>
                    {recs.length}
                  </span>
                </div>

                {recs.map((rec) => (
                  <Card key={rec.id} glow className="group">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Left: Icon accent */}
                      <div className={`hidden sm:flex p-2.5 rounded-xl border ${cfg.bg} shrink-0`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>

                      {/* Middle: Content */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                            {rec.ticket_number}
                          </span>
                          <Badge variant={cfg.badge}>
                            {cfg.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {rec.created_at
                              ? new Date(rec.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'Just now'}
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">{rec.suggestion}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{rec.reasoning}</p>
                      </div>

                      {/* Right: Action */}
                      <div className="shrink-0 sm:pt-1">
                        {rec.is_applied ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                          </span>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={applying === rec.id ? null : ChevronRight}
                            onClick={() => handleApply(rec)}
                            disabled={applying === rec.id}
                          >
                            {applying === rec.id ? (
                              <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Applying...
                              </span>
                            ) : 'Apply'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
