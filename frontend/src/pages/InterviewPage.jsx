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

const MicIndicator = ({ isLocked, side, turnsUsed, maxTurns }) => {
  const used = turnsUsed?.[side] ?? 0;
  const dots = Array.from({ length: maxTurns }, (_, i) => i < used);
  const accentOn = side === 'A' ? 'text-blue-300 border-blue-500/60 bg-blue-500/20' : 'text-violet-300 border-violet-500/60 bg-violet-500/20';
  const accentOff = 'text-slate-500 border-slate-700 bg-slate-800/40';

  return (
    <div className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-300 ${isLocked ? accentOn : accentOff}`}>
      <div className="relative">
        <svg className={`w-5 h-5 ${isLocked ? (side === 'A' ? 'text-blue-400' : 'text-violet-400') : 'text-slate-600'}`}
          fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6 9a1 1 0 0 1 2 0 8 8 0 0 1-7 7.938V20h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.062A8 8 0 0 1 4 10a1 1 0 0 1 2 0 6 6 0 0 0 12 0z"/>
        </svg>
        {isLocked && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-slate-900" />
        )}
      </div>
      <div className="flex gap-1">
        {dots.map((used_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full transition-all ${used_ ? (side === 'A' ? 'bg-blue-400' : 'bg-violet-400') : 'bg-slate-700'}`} />
        ))}
      </div>
      {isLocked && <span className="text-[10px] font-bold tracking-widest text-red-400">SPEAKING</span>}
    </div>
  );
};

const DebateRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [room, setRoom] = useState(null);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoEvalLoading, setAutoEvalLoading] = useState(false);
  
  // Mic Recording States
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const feedRef = useRef(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  const isCreator = room?.createdBy === user?.id;
  const myParticipant = room?.participants?.find(p => p.userId === user?.id);
  const mySide = myParticipant?.side || 'A';
  const myName = myParticipant?.name || user?.name || 'Me';

  const micHolder = room?.micHolder || null; // null | 'A' | 'B'
  const turnsUsed = room?.turnsUsed || { A: 0, B: 0 };
  const maxTurns = room?.maxTurnsPerSide || 5;
  const turnsLeft = maxTurns - (turnsUsed[mySide] || 0);
  const turnsExhausted = turnsLeft <= 0;

  const fetchRoom = useCallback(async () => {
    try {
      const res = await api.get(`/debate/room/${id}`);
      setRoom(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchTranscripts = useCallback(async () => {
    try {
      const res = await api.get(`/debate/transcripts/${id}`);
      setTranscripts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  // WebSocket connection for real-time events
  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = backendUrl.replace(/^https?:/, wsProto) + `/ws/${id}`;

    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state_update' || data.type === 'mic_update') {
            fetchRoom();
            fetchTranscripts();
          }
        } catch (err) {
          console.error("WS Parse error:", err);
        }
      };

      ws.onclose = () => {
        console.warn("WebSocket closed. Attempting reconnect in 3s...");
        setTimeout(() => {
          if (socketRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [id, fetchRoom, fetchTranscripts]);

  // Combined fetch on start
  useEffect(() => {
    Promise.all([fetchRoom(), fetchTranscripts()]).finally(() => setLoading(false));
  }, [fetchRoom, fetchTranscripts]);

  // Polling fallback
  useEffect(() => {
    if (room?.status === 'live') {
      pollRef.current = setInterval(() => {
        fetchTranscripts();
        fetchRoom();
      }, 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [room?.status, fetchTranscripts, fetchRoom]);

  // Auto-redirect to results
  useEffect(() => {
    if (room?.status === 'completed' && room?.evaluated) {
      setAutoEvalLoading(false);
      const timer = setTimeout(() => navigate(`/debate/${id}/results`), 2500);
      return () => clearTimeout(timer);
    }
  }, [room?.status, room?.evaluated, id, navigate]);

  // Faster polling when waiting for AI verdict
  useEffect(() => {
    if (!autoEvalLoading) return;
    const fast = setInterval(() => { fetchRoom(); }, 2000);
    return () => clearInterval(fast);
  }, [autoEvalLoading, fetchRoom]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [transcripts]);

  const handleStart = async () => {
    try { 
      await api.post('/debate/start-room', { roomId: id }); 
      await fetchRoom(); 
    } catch (err) { 
      setError(err.response?.data?.detail || 'Failed to start.'); 
    }
  };

  const handleEnd = async () => {
    try { 
      await api.post('/debate/end-room', { roomId: id }); 
      await fetchRoom(); 
    } catch (err) { 
      setError(err.response?.data?.detail || 'Failed to end.'); 
    }
  };

  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef(null);
  const finalSpeechTextRef = useRef('');

  // Mic Activation / Speaking turn
  const startRecording = async () => {
    setError('');
    setLiveTranscript('');
    finalSpeechTextRef.current = '';
    if (turnsExhausted) {
      setError("You have no speaking turns left!");
      return;
    }
    if (micHolder && micHolder !== mySide) {
      setError("Mic is locked. Waiting for opponent to release.");
      return;
    }

    try {
      // Request mic lock
      await api.post('/debate/mic/acquire', {
        roomId: id,
        side: mySide,
        participantName: myName
      });

      // Initialize Web Speech API Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (event) => {
          let interimText = '';
          let finalText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalText += event.results[i][0].transcript;
            } else {
              interimText += event.results[i][0].transcript;
            }
          }
          const recognized = (finalText || interimText).trim();
          if (recognized) {
            setLiveTranscript(recognized);
            finalSpeechTextRef.current = recognized;
          }
        };
        rec.start();
        recognitionRef.current = rec;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());

        const formData = new FormData();
        formData.append('roomId', id);
        formData.append('participantName', myName);
        formData.append('side', mySide);
        formData.append('file', blob, 'recording.wav');
        if (finalSpeechTextRef.current) {
          formData.append('textFallback', finalSpeechTextRef.current);
        }

        setSending(true);
        try {
          const res = await api.post('/debate/audio/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          await fetchTranscripts();
          await fetchRoom();
          if (res.data?.debateComplete) {
            setAutoEvalLoading(true);
          }
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to process voice transcript.');
        } finally {
          setSending(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError(err.response?.data?.detail || "Could not start recording. Make sure mic permission is granted.");
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setRecording(false);

    try {
      // Release mic lock
      await api.post('/debate/mic/release', {
        roomId: id,
        side: mySide,
        participantName: myName
      });
    } catch (err) {
      console.error("Failed to release mic lock:", err);
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room?.roomCode || '');
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000);
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
              : 'Both debaters have finished all 5 turns. The AI is evaluating transcripts and rendering results.'}
          </p>
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const sc = statusCfg[room.status] || statusCfg.waiting;
  const sideAP = room.participants?.find(p => p.side === 'A');
  const sideBP = room.participants?.find(p => p.side === 'B');

  const otherSide = mySide === 'A' ? 'B' : 'A';
  const isMicLockedByOther = micHolder && micHolder === otherSide;
  const isMicHeldByMe = micHolder && micHolder === mySide;

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
              const isLocked = micHolder === side;
              return (
                <div key={side} className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  isLocked
                    ? `border-${accent}-500 bg-${accent}-500/10 shadow-lg shadow-${accent}-500/15`
                    : (mySide === side ? 'border-slate-600 bg-slate-700/25' : 'border-slate-800 bg-slate-800/10')
                }`}>
                  <div className={`w-9 h-9 rounded-full bg-${accent}-500/20 flex items-center justify-center text-${accent}-300 text-sm font-bold flex-shrink-0`}>
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
                      isLocked={isLocked}
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
              isMicHeldByMe
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 animate-pulse'
                : isMicLockedByOther
                ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                : 'bg-slate-700/40 border border-slate-700 text-slate-400'
            }`}>
              {isMicHeldByMe ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  🎤 You are speaking live! Keep holding mic or click release when finished.
                </>
              ) : isMicLockedByOther ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  🔒 Opponent is speaking. Your microphone is locked.
                </>
              ) : (
                <>
                  🎤 Microphone is free. Grab the mic and state your argument! ({turnsLeft} of {maxTurns} turns left)
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

          {/* Controlled Mic System UI */}
          {room.status === 'live' ? (
            <div className="p-6 border-t border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center gap-4">
              {sending && (
                <div className="flex items-center gap-2 text-sm text-indigo-400 mb-2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Converting local voice into text using faster-whisper...</span>
                </div>
              )}

              {turnsExhausted ? (
                <div className="text-center py-3 text-slate-400 text-sm font-semibold bg-slate-800/50 w-full rounded-xl border border-slate-700">
                  ✅ You have used all 5 of your speaking turns. Waiting for other participant to finish.
                </div>
              ) : isMicLockedByOther ? (
                <div className="text-center py-6 w-full flex flex-col items-center justify-center bg-red-950/20 border border-red-900/30 rounded-2xl text-slate-400">
                  <svg className="w-8 h-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10M9 11V9a3 3 0 116 0v2M5 21h14a2 2 0 002-2v-1a7 7 0 00-14 0v1a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-semibold text-red-400">Mic is Locked by Opponent</p>
                  <p className="text-xs mt-1 text-slate-500">Wait for them to release the mic to speak.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={sending}
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
                      recording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white scale-105 ring-4 ring-red-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95'
                    } disabled:opacity-50`}
                  >
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                    </svg>
                    <span className="text-[10px] font-bold tracking-widest mt-1">
                      {recording ? 'RELEASE' : 'HOLD MIC'}
                    </span>
                  </button>

                  {recording && (
                    <div className="flex flex-col items-center gap-2 max-w-lg w-full">
                      {liveTranscript && (
                        <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl px-4 py-2 text-center text-xs text-emerald-300 font-medium max-w-md shadow-lg">
                          🎙️ <span className="text-slate-400">Realtime Preview: </span>"{liveTranscript}"
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-emerald-400 font-mono text-sm font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Recording: {formatTimer(recordingTime)}</span>
                      </div>
                      {/* Simple visualizer waves */}
                      <div className="flex items-center gap-0.5 h-3 mt-1">
                        {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                          <span
                            key={i}
                            className="w-0.5 bg-emerald-400 rounded-full animate-bounce"
                            style={{
                              height: `${h * 15}%`,
                              animationDelay: `${i * 0.1}s`,
                              animationDuration: '0.6s'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 text-center">
                    Turns Left: <strong className="text-white">{turnsLeft}</strong> / {maxTurns}
                  </div>
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
