import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getUser, removeAuthToken } from '@/utils/auth';

const statusColors = {
  waiting: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  live: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  completed: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const statusDot = {
  waiting: 'bg-amber-400',
  live: 'bg-emerald-400 animate-pulse',
  completed: 'bg-slate-400',
};

const DebateCard = ({ room, onClick }) => (
  <div
    onClick={onClick}
    className="group cursor-pointer bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5"
  >
    <div className="flex justify-between items-start mb-4">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${statusColors[room.status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[room.status]}`} />
        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
      </span>
      <span className="text-xs text-slate-500 font-mono bg-slate-700/50 px-2 py-1 rounded-lg">
        #{room.roomCode}
      </span>
    </div>

    <h3 className="text-white font-semibold text-base mb-3 line-clamp-2 group-hover:text-indigo-300 transition-colors">
      {room.topic}
    </h3>

    <div className="flex items-center justify-between text-xs text-slate-400">
      <span className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {room.participants?.length || 0} participant{room.participants?.length !== 1 ? 's' : ''}
      </span>
      <span>{room.sideALabel} vs {room.sideBLabel}</span>
    </div>

    {room.evaluated && (
      <div className="mt-3 pt-3 border-t border-slate-700">
        <span className="text-xs text-indigo-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AI Verdict Available
        </span>
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [myRooms, setMyRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const currentUser = getUser();
      setUser(currentUser);
      const [myRes, pubRes] = await Promise.all([
        api.get('/debate/my-rooms'),
        api.get('/debate/public-rooms'),
      ]);
      setMyRooms(myRes.data || []);
      setPublicRooms(pubRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (room) => {
    if (room.evaluated) {
      navigate(`/debate/${room.id}/results`);
    } else {
      navigate(`/debate/${room.id}`);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    window.location.href = '/signin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your debates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 hidden sm:block">
                Welcome, <span className="text-white font-medium">{user?.name}</span>
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden mb-10 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-8 md:p-12 shadow-2xl shadow-indigo-500/20">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-sm text-white/80 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI Judge — Neutral · Fair · Instant
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
              Host AI-Judged<br />Debates & Discussions
            </h1>
            <p className="text-indigo-100 mb-7 text-base">
              Create a room, debate live, and receive structured AI feedback ranking each participant on logic, clarity, and persuasion.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/debate/create')} size="lg"
                className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shadow-lg">
                + Create Room
              </Button>
              <Button onClick={() => navigate('/debate/join')} size="lg" variant="outline"
                className="border-white/40 text-white hover:bg-white/10 font-semibold">
                Join with Code
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'My Debates', value: myRooms.length, icon: '🏛️' },
            { label: 'Completed', value: myRooms.filter(r => r.status === 'completed').length, icon: '✅' },
            { label: 'Live Now', value: myRooms.filter(r => r.status === 'live').length, icon: '🔴' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* My Rooms */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold text-white">My Debate Rooms</h2>
            <Button onClick={() => navigate('/debate/create')} variant="outline" size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              + New Room
            </Button>
          </div>
          {myRooms.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/30 border border-slate-700 border-dashed rounded-2xl">
              <div className="text-4xl mb-3">🏛️</div>
              <p className="text-slate-400 mb-4">No debate rooms yet.</p>
              <Button onClick={() => navigate('/debate/create')} className="bg-indigo-600 hover:bg-indigo-700">
                Create Your First Room
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myRooms.map(room => (
                <DebateCard key={room.id} room={room} onClick={() => handleRoomClick(room)} />
              ))}
            </div>
          )}
        </section>

        {/* Public Rooms */}
        {publicRooms.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-5">Ongoing Public Debates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {publicRooms.map(room => (
                <DebateCard key={room.id} room={room} onClick={() => navigate(`/debate/${room.id}`)} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
