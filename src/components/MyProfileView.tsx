import React, { useState } from 'react';
import {
  User,
  Trophy,
  Activity,
  Zap,
  TrendingUp,
  Award,
  Target,
  Shield,
  Clock,
  Sparkles,
  Edit3,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { PlayerProfile, PlayerHistorySummary, PadelMatch } from '../types';
import { ActiveUserSession } from '../utils/playerProfilesStorage';
import { PlayerProfileModal } from './PlayerProfileModal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MyProfileViewProps {
  currentSession: ActiveUserSession;
  playerProfiles: PlayerProfile[];
  playerHistories: Record<string, PlayerHistorySummary>;
  matches: PadelMatch[];
  onSaveProfile: (profile: PlayerProfile) => void;
  onOpenAuthModal: () => void;
  onInspectMatch: (match: PadelMatch) => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  currentSession,
  playerProfiles,
  playerHistories,
  matches,
  onSaveProfile,
  onOpenAuthModal,
  onInspectMatch
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Find active profile
  const activeName = currentSession.playerName || 'Álvaro';
  const profile = playerProfiles.find(
    p => p.name.toLowerCase() === activeName.toLowerCase()
  ) || playerProfiles[0];

  const history = profile ? playerHistories[profile.name] : null;

  // If user is guest or hasn't selected their name yet
  if (!currentSession.playerName && !profile) {
    return (
      <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-8">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl">
          👤
        </div>
        <h3 className="text-lg font-black text-white">¿Quién eres en la pista?</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Selecciona tu jugador (Marcos, Mikel, Nico, Álvaro, Víctor...) para ver tu ficha personalizada, evolución táctica y récords.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          Elegir Mi Jugador
        </button>
      </div>
    );
  }

  // Matches played by this specific player
  const playerMatches = matches.filter(m => {
    const isP1 = m.team1?.player1?.toLowerCase() === profile.name.toLowerCase() || m.team1?.player2?.toLowerCase() === profile.name.toLowerCase();
    const isP2 = m.team2?.player1?.toLowerCase() === profile.name.toLowerCase() || m.team2?.player2?.toLowerCase() === profile.name.toLowerCase();
    return isP1 || isP2;
  });

  // Evolution chart data
  const chartData = (history?.timeline || []).map((t, idx) => ({
    matchIndex: `#${idx + 1}`,
    date: t.matchDate,
    title: t.matchTitle,
    enfPct: t.unforcedErrorPerTouchPct,
    winners: t.winners,
    touches: t.touches,
    won: t.won
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Profile Header Card */}
      <div className="bg-gradient-to-br from-[#0e1628] via-[#09101d] to-slate-950 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Glow accent */}
        <div 
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: profile.avatarColor || '#10b981' }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 shadow-xl"
                style={{ borderColor: profile.avatarColor || '#10b981' }}
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl border-2 border-slate-700"
                style={{ backgroundColor: profile.avatarColor || '#10b981' }}
              >
                {profile.name.charAt(0)}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {profile.name}
                </h2>
                {currentSession.isAdmin && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black rounded-md flex items-center gap-1">
                    <Shield className="w-3 h-3" /> ADMIN
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-emerald-400">
                {profile.nickname || 'Jugador del Circuito'}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                <span className="px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                  🏸 Posición: <strong className="text-white capitalize">{profile.preferredSide}</strong>
                </span>
                <span className="px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded-lg">
                  ✋ Mano: <strong className="text-white capitalize">{profile.dominantHand}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Editar Mi Foto / Info</span>
            </button>
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cambiar Jugador
            </button>
          </div>

        </div>

        {/* Profile Notes if any */}
        {profile.notes && (
          <div className="mt-5 p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-slate-400 block mb-0.5">Estilo & Notas de Juego:</span>
            {profile.notes}
          </div>
        )}

      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Win Rate */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Victorias</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {history ? `${history.winRate}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-400">
            {history ? `${history.matchesWon}V de ${history.matchesPlayed}PJ` : '0 PJ'}
          </div>
        </div>

        {/* % Errores No Forzados por Toque */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>% ENF / Toque</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {history ? `${history.unforcedErrorPerTouchPct.toFixed(1)}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-400">
            {history ? `1 fallo cada ${history.touchesPerUnforcedError.toFixed(1)} toques` : '-'}
          </div>
        </div>

        {/* Winners / Puntos Ganadores */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Winners Totales</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300">
            {history?.totalWinners || 0}
          </div>
          <div className="text-[11px] text-slate-400">
            {history ? `Media: ${history.avgWinners.toFixed(1)} / partido` : '-'}
          </div>
        </div>

        {/* Volumen de Toques */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Toques de Bola</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300">
            {history?.totalTouches || 0}
          </div>
          <div className="text-[11px] text-slate-400">
            {history ? `Media: ${history.avgTouches.toFixed(0)} toques` : '-'}
          </div>
        </div>

      </div>

      {/* 3. Personal Evolution Chart */}
      {chartData.length > 0 && (
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Tu Evolución de Precisión (% Errores por Toque)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Menor porcentaje indica mayor regularidad y solidez en pista
              </p>
            </div>
          </div>

          <div className="h-60 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="matchIndex" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(val: any) => [`${Number(val).toFixed(1)}%`, '% Errores/Toque']}
                />
                <Line
                  type="monotone"
                  dataKey="enfPct"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Recent Matches for this player */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-white flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Partidos Jugados por {profile.name} ({playerMatches.length})</span>
        </h3>

        {playerMatches.length > 0 ? (
          <div className="space-y-2.5">
            {playerMatches.map((m) => {
              const pStats = m.stats?.[profile.name];
              const isP1 = m.team1?.player1?.toLowerCase() === profile.name.toLowerCase() || m.team1?.player2?.toLowerCase() === profile.name.toLowerCase();
              const won = (isP1 && m.winnerTeam === 1) || (!isP1 && m.winnerTeam === 2);

              return (
                <div
                  key={m.id}
                  onClick={() => onInspectMatch(m)}
                  className="p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-4 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                      won ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {won ? 'VICTORIA' : 'DERROTA'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {m.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {m.date} • {m.setsScore}
                      </div>
                    </div>
                  </div>

                  {pStats && (
                    <div className="hidden sm:flex items-center gap-3 text-xs text-slate-300">
                      <span>🎾 {pStats.touches} toques</span>
                      <span className="text-cyan-400">⚡ {pStats.winners}W</span>
                      <span className="text-rose-400">❌ {pStats.unforcedErrors}ENF</span>
                    </div>
                  )}

                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
            Aún no has disputado ningún partido registrado en el historial.
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <PlayerProfileModal
        isOpen={isEditModalOpen}
        profile={profile}
        onSave={(updated) => {
          onSaveProfile(updated);
          setIsEditModalOpen(false);
        }}
        onClose={() => setIsEditModalOpen(false)}
      />

    </div>
  );
};
