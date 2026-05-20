import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';

const CreateRoom = () => {
  const [formData, setFormData] = useState({
    topic: '',
    sideALabel: 'Side A',
    sideBLabel: 'Side B',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.topic.trim()) {
      setError('Please enter a debate topic.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/debate/create-room', formData);
      if (res.data.success) {
        navigate(`/debate/${res.data.roomId}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const suggestedTopics = [
    'AI will replace human jobs within 10 years',
    'Social media does more harm than good',
    'Remote work is more productive than office work',
    'Cryptocurrency is the future of finance',
    'Space exploration should be a global priority',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">DebateIQ</span>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              ← Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Debate Room</h1>
          <p className="text-slate-400">Set the topic and labels, then share your room code with your opponent.</p>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-7">
          <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-indigo-300 text-sm">
            You will be assigned <strong className="text-indigo-200">Side A</strong> automatically. Share the room code with your opponent so they can join as Side B.
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-7 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-slate-200 font-medium">
                Debate Topic <span className="text-indigo-400">*</span>
              </Label>
              <textarea
                id="topic"
                name="topic"
                rows={3}
                placeholder="e.g. AI will replace human jobs within 10 years"
                value={formData.topic}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {/* Suggested Topics */}
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, topic: t })}
                      className="text-xs text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 rounded-full px-3 py-1 hover:bg-indigo-500/20 transition-colors"
                    >
                      {t.length > 40 ? t.slice(0, 40) + '…' : t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Side Labels */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sideALabel" className="text-slate-200 font-medium">
                  Your Side Label
                </Label>
                <Input
                  id="sideALabel"
                  name="sideALabel"
                  placeholder="Side A"
                  value={formData.sideALabel}
                  onChange={handleChange}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:ring-indigo-500 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sideBLabel" className="text-slate-200 font-medium">
                  Opponent Side Label
                </Label>
                <Input
                  id="sideBLabel"
                  name="sideBLabel"
                  placeholder="Side B"
                  value={formData.sideBLabel}
                  onChange={handleChange}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:ring-indigo-500 rounded-xl"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/')}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : 'Create Room →'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateRoom;
