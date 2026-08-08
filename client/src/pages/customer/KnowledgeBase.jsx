import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import { BookOpen, Search, Eye, ThumbsUp } from 'lucide-react';

const CustomerKnowledgeBase = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await api.get('/knowledge-base', { params: { search, published: 'true' } });
        if (res.success) setArticles(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [search]);

  if (loading) return <Loader text="Loading FAQs and Guides..." />;

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-12 max-w-5xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white font-display">Help & Self-Service Knowledge Base</h1>
        <p className="text-xs text-slate-400">Troubleshooting solutions for Starlink Internet, CCTV, and Smart Devices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((art) => (
          <Card key={art.id} className="space-y-3">
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">
              {art.category_name}
            </span>
            <h3 className="text-base font-bold text-white">{art.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{art.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CustomerKnowledgeBase;
