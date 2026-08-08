import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { BookOpen, Plus, Search, Eye, ThumbsUp, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const KnowledgeBase = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    categoryId: '',
    isPublished: true,
    isFeatured: false,
  });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/knowledge-base', {
        params: { search: searchTerm, category: selectedCategory },
      });
      if (res.success) {
        setArticles(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [searchTerm, selectedCategory]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/knowledge-base', formData);
      if (res.success) {
        toast.success('Knowledge Base article published!');
        setIsCreateModalOpen(false);
        fetchArticles();
      }
    } catch (e) {
      toast.error('Failed to create article');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/knowledge-base/${id}`);
      if (res.success) {
        toast.success('Article deleted');
        fetchArticles();
      }
    } catch (e) {
      toast.error('Failed to delete article');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Knowledge Base Management</h1>
          <p className="text-xs text-slate-400">Troubleshooting guides, FAQs, and self-service solutions</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} icon={Plus}>
          New Article
        </Button>
      </div>

      {/* Filter Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedCategory === '' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'glass-panel text-slate-300'
          }`}
        >
          All Categories
        </button>
        {['starlink_internet', 'cctv_system', 'smart_devices', 'installation'].map((slug) => (
          <button
            key={slug}
            onClick={() => setSelectedCategory(slug)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              selectedCategory === slug ? 'bg-cyan-500 text-slate-950 shadow-md' : 'glass-panel text-slate-300'
            }`}
          >
            {slug.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((art) => (
          <Card key={art.id} className="flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <Badge variant={art.is_published ? 'success' : 'warning'}>
                  {art.is_published ? 'Published' : 'Draft'}
                </Badge>
                <span className="text-[10px] text-slate-400">{art.category_name}</span>
              </div>
              <h3 className="text-base font-bold text-white line-clamp-2">{art.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-3 mt-2 leading-relaxed">{art.excerpt || art.content}</p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-cyan-400" /> {art.views || 0}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /> {art.helpful_count || 0}</span>
              </div>

              <button
                onClick={() => handleDelete(art.id)}
                className="p-1 text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Knowledge Base Article">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Article Title"
            placeholder="e.g. How to reboot Starlink Router via App"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Category</label>
            <select
              className="glass-input w-full rounded-xl py-2.5 px-3 text-sm"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="" className="bg-slate-900">Select Category...</option>
              <option value="starlink_internet" className="bg-slate-900">Starlink Internet</option>
              <option value="cctv_system" className="bg-slate-900">CCTV System</option>
              <option value="smart_devices" className="bg-slate-900">Smart Devices</option>
              <option value="installation" className="bg-slate-900">Installation Request</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Summary / Excerpt</label>
            <input
              type="text"
              className="glass-input w-full rounded-xl px-4 py-2 text-sm"
              placeholder="Brief 1-sentence summary"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Article Content</label>
            <textarea
              rows={6}
              className="glass-input w-full rounded-xl p-3 text-sm"
              placeholder="Full troubleshooting guide..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Publish Article</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
