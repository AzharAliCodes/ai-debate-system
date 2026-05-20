import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';

const ScoreBar = ({ score, color }) => (
  <div className="w-full bg-slate-700 rounded-full h-2">
    <div
      className={`h-2 rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.min(score, 100)}%` }}
    />
  </div>
);

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/debate/results/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading AI verdict...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Results Yet</h2>
          <p className="text-slate-400 mb-6">The AI verdict hasn't been generated for this debate.</p>
          <Button onClick={() => navigate(`/debate/${id}`)} className="bg-indigo-600 hover:bg-indigo-700">
            Back to Room
          </Button>
        </div>
      </div>
    );
  }

  const { feedback: fb, leaderboard, room } = data;
  const sideAScore = fb?.sideA?.score ?? 0;
  const sideBScore = fb?.sideB?.score ?? 0;
  const winner = fb?.winner || '';
  const isTie = winner === 'Tie';
  const sideAWins = winner.includes('Side A');

  const SideCard = ({ side, sideData, label, isWinner, accentClass, borderClass, barColor }) => (
    <div className={`bg-slate-800/60 backdrop-blur-sm border-2 ${isWinner ? borderClass : 'border-slate-700'} rounded-2xl p-6 relative overflow-hidden`}>
      {isWinner && (
        <div className={`absolute top-0 right-0 ${accentClass} text-white text-xs font-bold px-3 py-1 rounded-bl-xl`}>
          🏆 WINNER
        </div>
      )}
      <div className="mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-black text-white">{sideData?.score ?? 0}</span>
          <span className="text-slate-500 pb-1">/100</span>
        </div>
        <ScoreBar score={sideData?.score ?? 0} color={barColor} />
      </div>

      <p className="text-slate-300 text-sm mb-5 leading-relaxed border-l-2 border-slate-600 pl-3 italic">
        {sideData?.summary || 'No summary available.'}
      </p>

      <div className="space-y-4">
        {sideData?.strengths?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">✓ Strengths</p>
            <ul className="space-y-1.5">
              {sideData.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {sideData?.weaknesses?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">✗ Weaknesses</p>
            <ul className="space-y-1.5">
              {sideData.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>{w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">DebateIQ</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/debate/${id}`)} variant="outline" size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Room
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Verdict Banner */}
        <div className={`rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden ${isTie ? 'bg-gradient-to-r from-slate-700 to-slate-600' : sideAWins ? 'bg-gradient-to-r from-blue-700 to-indigo-700' : 'bg-gradient-to-r from-violet-700 to-purple-700'}`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div className="relative z-10">
            <div className="text-5xl mb-3">{isTie ? '🤝' : '🏆'}</div>
            <h1 className="text-3xl font-black text-white mb-1">
              {isTie ? "It's a Tie!" : `${winner} Wins!`}
            </h1>
            <p className="text-white/70 text-sm max-w-xl mx-auto">{fb?.reason}</p>
          </div>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 gap-4">
          {leaderboard?.map((entry) => (
            <div key={entry.side}
              className={`bg-slate-800/50 border rounded-2xl p-5 text-center ${entry.isWinner ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-slate-700'}`}>
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">{entry.label}</p>
              <p className="text-4xl font-black text-white">{entry.score}</p>
              <p className="text-slate-500 text-xs">/100</p>
              {entry.isWinner && !isTie && (
                <span className="mt-2 inline-block text-xs text-indigo-400 font-semibold">🏆 Winner</span>
              )}
            </div>
          ))}
        </div>

        {/* Topic */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Debate Topic</p>
          <p className="text-white font-semibold">{room?.topic}</p>
          <p className="text-slate-500 text-xs mt-1">{fb?.transcriptCount} total statements analyzed</p>
        </div>

        {/* Side Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SideCard
            side="A" sideData={fb?.sideA} label={fb?.sideALabel || 'Side A'}
            isWinner={sideAWins && !isTie}
            accentClass="bg-blue-600" borderClass="border-blue-500/60" barColor="bg-blue-500"
          />
          <SideCard
            side="B" sideData={fb?.sideB} label={fb?.sideBLabel || 'Side B'}
            isWinner={!sideAWins && !isTie}
            accentClass="bg-violet-600" borderClass="border-violet-500/60" barColor="bg-violet-500"
          />
        </div>

        {/* Final Verdict */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">AI Judge's Final Verdict</h3>
          </div>
          <p className="text-slate-300 leading-relaxed">{fb?.finalVerdict || 'No final verdict available.'}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pb-4">
          <Button onClick={() => navigate('/')} variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl px-8">
            Dashboard
          </Button>
          <Button onClick={() => navigate('/debate/create')}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl px-8 shadow-lg shadow-indigo-500/20">
            New Debate
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
