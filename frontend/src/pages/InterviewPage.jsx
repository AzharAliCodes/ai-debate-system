import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/utils/api';
import { getUser } from '@/utils/auth';

const SideBadge = ({ side, label }) => {
  const cls = side === 'A'
    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
    : 'bg-violet-500/20 text-violet-300 border border-violet-500/40';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label || `Side ${side}`}
    </span>
  );
};

// Mic indicator: shows ON AIR when it's this side's turn
const MicIndicator = ({ isMyTurn, side, turnsUsed, maxTurns }) => {
  const used = turnsUsed?.[side] ?? 0;
  const dots = Array.from({ length: maxTurns }, (_, i) => i < used);
  const accentOn = side === 'A' ? 'text-blue-300 border-blue-500/60 bg-blue-500/20' : 'text-violet-300 border-violet-500/60 bg-violet-500/20';
  const accentOff = 'text-slate-500 border-slate-700 bg-slate-800/40';

  return (
    <div className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-300 ${isMyTurn ? accentOn : accentOff}`}>
      <div className="relative">
        <svg className={`w-5 h-5 ${isMyTurn ? (side === 'A' ? 'text-blue-400' : 'text-violet-400') : 'text-slate-600'}`}
          fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6 9a1 1 0 0 1 2 0 8 8 0 0 1-7 7.938V20h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.062A8 8 0 0 1 4 10a1 1 0 0 1 2 0 6 6 0 0 0 12 0z"/>
        </svg>
        {isMyTurn && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-slate-900" />
        )}
      </div>
      <div className="flex gap-1">
        {dots.map((used_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full transition-all ${used_ ? (side === 'A' ? 'bg-blue-400' : 'bg-violet-400') : 'bg-slate-700'}`} />
        ))}
      </div>
      {isMyTurn && <span className="text-[10px] font-bold tracking-widest text-emerald-400">ON AIR</span>}
    </div>
  );
};

const DebateRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [room, setRoom] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoEvalLoading, setAutoEvalLoading] = useState(false);
  const feedRef = useRef(null);
  const pollRef = useRef(null);

  const isCreator = room?.createdBy === user?.id;
  const myParticipant = room?.participants?.find(p => p.userId === user?.id);
  const mySide = myParticipant?.side || 'A';
  const myName = myParticipant?.name || user?.name || 'Me';

  const currentTurn = room?.currentTurn || 'A';
  const turnsUsed = room?.turnsUsed || { A: 0, B: 0 };
  const maxTurns = room?.maxTurnsPerSide || 2;
  const isMyTurn = room?.status === 'live' && currentTurn === mySide;
  const myTurnsLeft = maxTurns - (turnsUsed[mySide] || 0);
  const myTurnsExhausted = myTurnsLeft <= 0;

  const fetchRoom = useCallback(async () => {
    const res = await api.get(`/debate/room/${id}`);
    setRoom(res.data);
  }, [id]);

  const fetchTranscripts = useCallback(async () => {
    const res = await api.get(`/debate/transcripts/${id}`);
    setTranscripts(res.data || []);
  }, [id]);

  useEffect(() => {
    Promise.all([fetchRoom(), fetchTranscripts()]).finally(() => setLoading(false));
  }, [fetchRoom, fetchTranscripts]);

  useEffect(() => {
    if (room?.status === 'live') {
      pollRef.current = setInterval(() => { fetchTranscripts(); fetchRoom(); }, 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [room?.status, fetchTranscripts, fetchRoom]);

  // Auto-redirect when debate is completed and evaluated
  useEffect(() => {
    if (room?.status === 'completed' && room?.evaluated) {
      setAutoEvalLoading(false);
      const timer = setTimeout(() => navigate(`/debate/${id}/results`), 2500);
      return () => clearTimeout(timer);
    }
  }, [room?.status, room?.evaluated, id, navigate]);

  // Poll faster when autoEvalLoading
  useEffect(() => {
    if (!autoEvalLoading) return;
    const fast = setInterval(() => { fetchRoom(); }, 2000);
    return () => clearInterval(fast);
  }, [autoEvalLoading, fetchRoom]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [transcripts]);

  const handleStart = async () => {
    try { await api.post('/debate/start-room', { roomId: id }); await fetchRoom(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to start.'); }
  };

  const handleEnd = async () => {
    try { await api.post('/debate/end-room', { roomId: id }); await fetchRoom(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to end.'); }
  };

  const handleSend = async () => {
    const msg = message.trim();
    if (!msg || !isMyTurn || myTurnsExhausted) return;
    setSending(true); setError('');
    try {
      const res = await api.post('/debate/transcript/add', {
        roomId: id, participantName: myName, side: mySide, message: msg
      });
      setMessage('');
      await fetchTranscripts();
      await fetchRoom();
      if (res.data?.debateComplete) {
        setAutoEvalLoading(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit.');
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room?.roomCode || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const statusCfg = {
    waiting:   { label: 'Waiting',  dot: 'bg-amber-400',                     cls: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
    live:      { label: 'Live',     dot: 'bg-emerald-400 animate-pulse',      cls: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
    completed: { label: 'Ended',    dot: 'bg-slate-400',                      cls: 'text-slate-400 bg-slate-500/20 border-slate-500/30' },
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading debate room...</p>
      </div>
    </div>
  );

  if (!room) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-white mb-4">Room Not Found</h2>
        <Button onClick={() => navigate('/')} className="bg-indigo-600 hover:bg-indigo-700">← Dashboard</Button>
      </div>
    </div>
  );

  // Auto-eval loading overlay
  if (autoEvalLoading || (room?.status === 'completed' && room?.evaluated)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center px-4">
          <div className="text-6xl mb-2">⚖️</div>
          <h2 className="text-2xl font-bold text-white">
            {room?.evaluated ? 'AI Verdict Ready!' : 'AI is Judging...'}
          </h2>
          <p className="text-slate-400 text-sm max-w-xs">
            {room?.evaluated
              ? 'Redirecting you to the results page...'
              : 'Both debaters have finished. The AI is now evaluating all arguments.'}
          </p>
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const sc = statusCfg[room.status] || statusCfg.waiting;
  const sideAP = room.participants?.find(p => p.side === 'A');
  const sideBP = room.participants?.find(p => p.side === 'B');

  const turnLabel = currentTurn === 'A'
    ? (sideAP?.name || room.sideALabel || 'Side A')
    : (sideBP?.name || room.sideBLabel || 'Side B');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">DebateIQ</span>
            <span className={`hidden sm:flex text-xs font-semibold px-2.5 py-1 rounded-full border items-center gap-1.5 ${sc.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {room.evaluated && (
              <Button onClick={() => navigate(`/debate/${id}/results`)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs">
                View Results
              </Button>
            )}
            <Button onClick={() => navigate('/')} variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
              ← Back
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        {/* Room Info */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-5">
          <div className="flex flex-wrap gap-4 justify-between items-start">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Debate Topic</p>
              <h2 className="text-lg font-bold text-white">{room.topic}</h2>
            </div>
            <button onClick={copyCode} className="font-mono text-sm font-bold text-white bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 flex-shrink-0">
              {room.roomCode}
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copied ? "M5 13l4 4L19 7" : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"} />
              </svg>
              {copied && <span className="text-emerald-400 text-xs">Copied!</span>}
            </button>
          </div>

          {/* Participants with Mic Indicators */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
            {[
              { p: sideAP, side: 'A', label: room.sideALabel, accent: 'blue' },
              { p: sideBP, side: 'B', label: room.sideBLabel, accent: 'violet' }
            ].map(({ p, side, label, accent }) => {
              const isTurnSide = room.status === 'live' && currentTurn === side;
              return (
                <div key={side} className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  isTurnSide
                    ? `border-${accent}-500/60 bg-${accent}-500/15 shadow-lg shadow-${accent}-500/10`
                    : (mySide === side ? `border-${accent}-500/30 bg-${accent}-500/08` : 'border-slate-700 bg-slate-700/20')
                }`}>
                  <div className={`w-9 h-9 rounded-full bg-${accent}-500/30 flex items-center justify-center text-${accent}-300 text-sm font-bold flex-shrink-0`}>
                    {p?.name?.[0]?.toUpperCase() || side}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-sm font-medium text-white truncate">
                      {p?.name || (side === 'B' ? 'Waiting for opponent...' : 'Host')}
                      {mySide === side && <span className="text-xs text-slate-500 ml-1">(You)</span>}
                    </p>
                  </div>
                  {room.status === 'live' && (
                    <MicIndicator
                      isMyTurn={isTurnSide}
                      side={side}
                      turnsUsed={turnsUsed}
                      maxTurns={maxTurns}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Turn Banner */}
          {room.status === 'live' && (
            <div className={`mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              isMyTurn
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                : 'bg-slate-700/40 border border-slate-700 text-slate-400'
            }`}>
              {isMyTurn ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  🎤 It's your turn! Speak now — {myTurnsLeft} chance{myTurnsLeft !== 1 ? 's' : ''} left
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  ⏳ Waiting for <strong className="text-white ml-1">{turnLabel}</strong> to speak...
                </>
              )}
            </div>
          )}

          {/* Controls (creator only) */}
          {isCreator && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700">
              {room.status === 'waiting' && (
                <Button onClick={handleStart} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl">▶ Start Debate</Button>
              )}
              {room.status === 'live' && (
                <Button onClick={handleEnd} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl">⏹ End Early</Button>
              )}
            </div>
          )}
          {!isCreator && room.status === 'completed' && room.evaluated && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <Button onClick={() => navigate(`/debate/${id}/results`)} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl">🏆 View Results</Button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-xl">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {/* Transcript */}
        <div className="flex-1 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />Live Transcript
            </h3>
            <span className="text-xs text-slate-500">{transcripts.length} statement{transcripts.length !== 1 ? 's' : ''}</span>
          </div>

          <div ref={feedRef} className="overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 py-12">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-sm">{room.status === 'live' ? 'Waiting for first speaker...' : 'No statements yet.'}</p>
                {room.status === 'waiting' && <p className="text-xs mt-1">Waiting for host to start...</p>}
              </div>
            ) : transcripts.map((entry) => {
              const isMe = entry.participantId === user?.id;
              const isSideA = entry.side === 'A';
              return (
                <div key={entry.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] border rounded-2xl px-4 py-3 ${isSideA ? 'bg-blue-500/15 border-blue-500/30' : 'bg-violet-500/15 border-violet-500/30'}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-semibold ${isSideA ? 'text-blue-400' : 'text-violet-400'}`}>
                        {entry.participantName}{isMe ? ' (You)' : ''}
                      </span>
                      <SideBadge side={entry.side} label={entry.side === 'A' ? room.sideALabel : room.sideBLabel} />
                      <span className="text-xs text-slate-600 ml-auto">{fmtTime(entry.timestamp)}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{entry.message}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input area */}
          {room.status === 'live' ? (
            <div className="p-4 border-t border-slate-700">
              {!isMyTurn ? (
                <div className="flex items-center justify-center gap-3 py-4 rounded-xl bg-slate-700/30 border border-slate-700 text-slate-500 text-sm">
                  <svg className="w-5 h-5 text-amber-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10M9 11V9a3 3 0 116 0v2M5 21h14a2 2 0 002-2v-1a7 7 0 00-14 0v1a2 2 0 002 2z" />
                  </svg>
                  <span>Mic is locked — waiting for <strong className="text-slate-300">{turnLabel}</strong> to speak</span>
                </div>
              ) : myTurnsExhausted ? (
                <div className="flex items-center justify-center gap-3 py-4 rounded-xl bg-slate-700/30 border border-slate-700 text-slate-500 text-sm">
                  ✅ You've used all your chances. Waiting for the debate to complete...
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`🎤 It's your turn! Type your argument... (${myTurnsLeft} chance${myTurnsLeft !== 1 ? 's' : ''} left)`}
                      className="w-full bg-slate-700/50 border border-emerald-500/40 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-600">Speaking as:</span>
                      <SideBadge side={mySide} label={mySide === 'A' ? room.sideALabel : room.sideBLabel} />
                      <span className="text-xs text-slate-600 ml-auto">
                        {turnsUsed[mySide] || 0}/{maxTurns} turns used
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    className="self-start mt-0.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold px-5 rounded-xl disabled:opacity-40 h-10"
                  >
                    {sending
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    }
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border-t border-slate-700 text-center text-slate-500 text-sm">
              {room.status === 'waiting' && '⏳ Waiting for host to start the debate...'}
              {room.status === 'completed' && '🏁 Debate ended.'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DebateRoom;
