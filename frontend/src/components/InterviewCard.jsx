import React from 'react';
import { useNavigate } from 'react-router-dom';

const statusColors = {
  waiting: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
  live:    { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400 animate-pulse' },
  completed: { badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
};

const DebateRoomCard = ({ room }) => {
  const navigate = useNavigate();
  const sc = statusColors[room.status] || statusColors.waiting;

  const handleClick = () => {
    if (room.evaluated) navigate(`/debate/${room.id}/results`);
    else navigate(`/debate/${room.id}`);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className="group cursor-pointer bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${sc.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
        </span>
        <span className="text-xs text-slate-500 font-mono bg-slate-700/50 px-2 py-1 rounded-lg">
          #{room.roomCode}
        </span>
      </div>

      <h3 className="text-white font-semibold text-base mb-3 line-clamp-2 group-hover:text-indigo-300 transition-colors leading-snug">
        {room.topic}
      </h3>

      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {room.participants?.length || 0}/{2} participants
        </span>
        <span className="text-slate-600">{room.sideALabel} vs {room.sideBLabel}</span>
      </div>

      {/* Participant avatars */}
      <div className="flex items-center gap-2">
        {['A', 'B'].map(side => {
          const p = room.participants?.find(x => x.side === side);
          const color = side === 'A' ? 'bg-blue-500/30 text-blue-300' : 'bg-violet-500/30 text-violet-300';
          return (
            <div key={side} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${p ? color : 'bg-slate-700 text-slate-600'}`}>
              {p?.name?.[0]?.toUpperCase() || '?'}
            </div>
          );
        })}
        {room.evaluated && (
          <span className="ml-auto text-xs text-indigo-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verdict ready
          </span>
        )}
      </div>
    </div>
  );
};

export default DebateRoomCard;
