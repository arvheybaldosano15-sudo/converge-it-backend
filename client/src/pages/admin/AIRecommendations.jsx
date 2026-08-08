import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecs = async () => {
    try {
      const res = await api.get('/ai/recommendations');
      if (res.success) {
        setRecommendations(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, []);

  const handleApply = async (id) => {
    try {
      const res = await api.put(`/ai/recommendations/${id}/apply`);
      if (res.success) {
        toast.success('AI recommendation applied');
        fetchRecs();
      }
    } catch (e) {
      toast.error('Failed to apply recommendation');
    }
  };

  if (loading) return <Loader text="Analyzing AI recommendation models..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">AI Recommendations & Insights</h1>
        <p className="text-xs text-slate-400">GPT-4o powered ticket optimization, priority adjustments, and ETA predictions</p>
      </div>

      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <Card className="text-center py-12">
            <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-400">No pending AI recommendations.</p>
          </Card>
        ) : (
          recommendations.map((rec) => (
            <Card key={rec.id} glow className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{rec.ticket_number}</span>
                  <Badge variant="cyan">{rec.type}</Badge>
                  <span className="text-[10px] text-emerald-400 font-semibold">{rec.confidence}% Confidence</span>
                </div>
                <h4 className="text-sm font-bold text-white">{rec.suggestion}</h4>
                <p className="text-xs text-slate-300">{rec.reasoning}</p>
              </div>

              <div>
                {rec.is_applied ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Applied
                  </span>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => handleApply(rec.id)}>
                    Apply Suggestion
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;
