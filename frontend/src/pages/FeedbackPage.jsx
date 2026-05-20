import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';

const ScoreBar = ({ score, color }) => (
  <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
    <div
      className={`h-full rounded-full transition-all duration-1000 ${color}`}
      style={{ width: `${Math.min(score * 10, 100)}%` }} // normalized since score is out of 10
    />
  </div>
);

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resultsRes, transcriptsRes] = await Promise.all([
          api.get(`/debate/results/${id}`),
          api.get(`/debate/transcripts/${id}`)
        ]);
        setData(resultsRes.data);
        setTranscripts(transcriptsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
  const winner = fb?.winner || '';
  const confidence = fb?.confidence ?? 100;
  const reasoning = fb?.reasoning || fb?.reason || '';

  const participants = room?.participants || [];
  const partA = participants.find(p => p.side === 'A');
  const partB = participants.find(p => p.side === 'B');
  const nameA = partA?.name || 'Side A';
  const nameB = partB?.name || 'Side B';

  const isTie = winner.toLowerCase() === 'tie';
  const sideAWins = winner === nameA || winner === 'Side A';

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  const audioUrl = fb?.audioPath ? `${backendUrl}${fb.audioPath}` : null;

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        
        {/* Debate Title & Room Code Header */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Debate Title</p>
            <h1 className="text-xl font-black text-white">{room?.topic}</h1>
            <p className="text-xs text-indigo-400 mt-1">Room Code: #{room?.roomCode}</p>
          </div>
          <div className="bg-indigo-950/40 border border-indigo-500/20 px-4 py-2 rounded-2xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-semibold">AI Confident Score: {confidence}%</span>
          </div>
        </div>

        {/* Verdict Banner / Winner Badge */}
        <div className={`rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden ${
          isTie 
            ? 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 border border-slate-600' 
            : sideAWins 
            ? 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-700 border border-blue-600' 
            : 'bg-gradient-to-r from-violet-700 via-purple-700 to-violet-700 border border-violet-600'
        }`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          <div className="relative z-10">
            <div className="text-6xl mb-3">{isTie ? '🤝' : '🏆'}</div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              {isTie ? "It's a Tie!" : `${winner} Wins!`}
            </h1>
            <p className="text-white/80 text-sm max-w-2xl mx-auto leading-relaxed font-medium">
              {reasoning}
            </p>
          </div>
        </div>

        {/* Playable Voice Result */}
        {audioUrl && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Verdict Voice Narration</h3>
                <p className="text-xs text-slate-500">Listen to the detailed analysis generated by the AI Judge</p>
              </div>
            </div>
            <audio controls src={audioUrl} className="w-full md:w-auto min-w-[280px]" />
          </div>
        )}

        {/* Detailed Metrics & Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Participant A Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 relative overflow-hidden">
            {sideAWins && !isTie && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl tracking-widest uppercase">
                WINNER
              </div>
            )}
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{room?.sideALabel || 'Side A'}</p>
            <h2 className="text-2xl font-black text-white mb-4">{nameA}</h2>

            <div className="space-y-4">
              {/* Overall Score */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Debate Score</span>
                  <span className="text-white font-bold">{fb?.scores?.[nameA] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.scores?.[nameA] ?? 0} color="bg-blue-500" />
              </div>

              {/* Communication Quality */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Communication Quality</span>
                  <span className="text-white font-bold">{fb?.communication_quality?.[nameA] ?? fb?.communication_quality?.['Side A'] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.communication_quality?.[nameA] ?? fb?.communication_quality?.['Side A'] ?? 0} color="bg-cyan-500" />
              </div>

              {/* Argument Strength */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Argument Strength</span>
                  <span className="text-white font-bold">{fb?.argument_strength?.[nameA] ?? fb?.argument_strength?.['Side A'] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.argument_strength?.[nameA] ?? fb?.argument_strength?.['Side A'] ?? 0} color="bg-emerald-500" />
              </div>

              {/* Logical Consistency */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Logical Consistency</span>
                  <span className="text-white font-bold">{fb?.logical_consistency?.[nameA] ?? fb?.logical_consistency?.['Side A'] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.logical_consistency?.[nameA] ?? fb?.logical_consistency?.['Side A'] ?? 0} color="bg-indigo-500" />
              </div>
            </div>
          </div>

          {/* Participant B Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 relative overflow-hidden">
            {!sideAWins && !isTie && (
              <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl tracking-widest uppercase">
                WINNER
              </div>
            )}
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{room?.sideBLabel || 'Side B'}</p>
            <h2 className="text-2xl font-black text-white mb-4">{nameB}</h2>

            <div className="space-y-4">
              {/* Overall Score */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Debate Score</span>
                  <span className="text-white font-bold">{fb?.scores?.[nameB] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.scores?.[nameB] ?? 0} color="bg-violet-500" />
              </div>

              {/* Communication Quality */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Communication Quality</span>
                  <span className="text-white font-bold">{fb?.communication_quality?.[nameB] ?? fb?.communication_quality?.['Side B'] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.communication_quality?.[nameB] ?? fb?.communication_quality?.['Side B'] ?? 0} color="bg-pink-500" />
              </div>

              {/* Argument Strength */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Argument Strength</span>
                  <span className="text-white font-bold">{fb?.argument_strength?.[nameB] ?? fb?.argument_strength?.['Side B'] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.argument_strength?.[nameB] ?? fb?.argument_strength?.['Side B'] ?? 0} color="bg-purple-500" />
              </div>

              {/* Logical Consistency */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                  <span>Logical Consistency</span>
                  <span className="text-white font-bold">{fb?.logical_consistency?.[nameB] ?? fb?.logical_consistency?.['Side B'] ?? 0} / 10</span>
                </div>
                <ScoreBar score={fb?.logical_consistency?.[nameB] ?? fb?.logical_consistency?.['Side B'] ?? 0} color="bg-fuchsia-500" />
              </div>
            </div>
          </div>

        </div>

        {/* Full Transcript Storage section */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Saved Debate Transcript Storage
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{transcripts.length} total statements</span>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {transcripts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No transcript entries found.</p>
            ) : transcripts.map((entry) => {
              const isSideA = entry.side === 'A';
              return (
                <div key={entry.id} className="border-b border-slate-800/80 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold ${isSideA ? 'text-blue-400' : 'text-violet-400'}`}>
                      {entry.participantName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/35">
                      {isSideA ? room.sideALabel : room.sideBLabel}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto">{fmtTime(entry.timestamp)}</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{entry.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pb-4">
          <Button onClick={() => navigate('/')} variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl px-8">
            Dashboard History
          </Button>
          <Button onClick={() => navigate('/debate/create')}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl px-8 shadow-lg shadow-indigo-500/20">
            Host New Debate
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
