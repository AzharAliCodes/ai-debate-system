import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import { getUser } from '@/utils/auth';

const JoinRoom = () => {
  const [formData, setFormData] = useState({ roomCode: '', participantName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = getUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const code = formData.roomCode.trim().toUpperCase();
    const name = formData.participantName.trim() || user?.name || '';
    if (!code) { setError('Please enter a room code.'); return; }
    if (code.length !== 6) { setError('Room code must be exactly 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/debate/join-room', { roomCode: code, participantName: name });
      if (res.data.success) {
        navigate(`/debate/${res.data.roomId}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to join room. Check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.name === 'roomCode'
      ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      : e.target.value;
    setFormData({ ...formData, [e.target.name]: val });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
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
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join a Debate Room</h1>
            <p className="text-slate-400 text-sm">Enter the 6-character room code shared by the host.</p>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 mb-6">
            <svg className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-violet-300 text-sm">
              You will be assigned <strong className="text-violet-200">Side B</strong> automatically as the guest participant.
            </p>
          </div>

          {/* Form */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-7 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Room Code */}
              <div className="space-y-2">
                <Label htmlFor="roomCode" className="text-slate-200 font-medium">
                  Room Code <span className="text-violet-400">*</span>
                </Label>
                <Input
                  id="roomCode"
                  name="roomCode"
                  placeholder="ABC123"
                  value={formData.roomCode}
                  onChange={handleChange}
                  maxLength={6}
                  autoFocus
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:ring-violet-500 rounded-xl font-mono text-center text-2xl tracking-widest h-14 uppercase"
                />
                <p className="text-xs text-slate-500 text-center">{formData.roomCode.length}/6 characters</p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="participantName" className="text-slate-200 font-medium">
                  Your Display Name
                </Label>
                <Input
                  id="participantName"
                  name="participantName"
                  placeholder={user?.name || 'Your name in this debate'}
                  value={formData.participantName}
                  onChange={handleChange}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-500 focus:ring-violet-500 rounded-xl"
                />
                <p className="text-xs text-slate-500">Leave blank to use your account name.</p>
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
                <Button type="submit" disabled={loading || formData.roomCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 disabled:opacity-50">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Joining...
                    </span>
                  ) : 'Join Room →'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JoinRoom;
