import React from 'react';
import {
  Trophy,
  Calendar,
  Sparkles,
  Flame,
  ChevronRight,
  TrendingUp,
  Activity,
  Users,
  Play,
  ArrowRight,
  Shield,
  Zap,
  Award,
  Video,
  Eye,
  Plus
} from 'lucide-react';
import { PadelMatch, PlayerHistorySummary, PlayerProfile, ClubThemeConfig } from '../types';
import { ActiveUserSession } from '../utils/playerProfilesStorage';
import { AppNavTab } from './SidebarDrawer';

interface HomeDashboardProps {
  clubTheme: ClubThemeConfig;
  matches: PadelMatch[];
  playerHistories: Record<string, PlayerHistorySummary>;
  playerProfiles: PlayerProfile[];
  currentSession: ActiveUserSession;
  isAdmin: boolean;
  onNavigateTab: (tab: AppNavTab) => void;
  onInspectMatch: (match: PadelMatch) => void;
  onSelectPlayerForDetail: (playerName: string) => void;
  onOpenNewMatchModal: () => void;
  onOpenClubThemeModal: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  clubTheme,
  matches,
  playerHistories,
  playerProfiles,
  currentSession,
  isAdmin,
  onNavigateTab,
  onInspectMatch,
  onSelectPlayerForDetail,
  onOpenNewMatchModal,
  onOpenClubThemeModal
}) => {
  // Latest completed match (or most recent match)
  const latestMatch = matches && matches.length > 0 ? matches[0] : null;

  // Derive top stats
  const totalMatchesCount = matches.length;
  const historyList: PlayerHistorySummary[] = Object.values(playerHistories);
  const bestWinRatePlayer = historyList.length > 0
    ? [...historyList].sort((a, b) => b.winRate - a.winRate || b.matchesWon - a.matchesWon)[0]
    : null;
  const mostActivePlayer = historyList.length > 0
    ? [...historyList].sort((a, b) => b.matchesPlayed - a.matchesPlayed)[0]
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. HERO BANNER CON FOTO DE EQUIPO OFICIAL */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl">
        {/* Background Image / Team Photo */}
        <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-slate-900">
          {clubTheme.bannerImageUrl ? (
            <img
              src={clubTheme.bannerImageUrl}
              alt="Foto de Equipo Oficial"
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-950 flex items-center justify-center p-6 text-center">
              <div className="space-y-3 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl shadow-lg">
                  🎾
                </div>
                <h3 className="text-xl font-black text-white">Foto Oficial del Club</h3>
                <p className="text-xs text-slate-300">
                  Sube la foto del equipo en la pista para que presida la portada del circuito.
                </p>
                {isAdmin && (
                  <button
                    onClick={onOpenClubThemeModal}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow-lg"
                  >
                    Subir Foto de Equipo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Gradients overlay for perfect text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />
        </div>

        {/* Content over banner */}
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-md text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Circuito Oficial de Pádel</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
              {clubTheme.clubName || 'PadelStats Pro'}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl line-clamp-2 drop-shadow">
              {clubTheme.clubTagline || 'Estadísticas en vivo, grabaciones y evolución del grupo de amigos.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isAdmin && (
              <button
                onClick={onOpenClubThemeModal}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-600/80 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                title="Cambiar foto de portada o nombre"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Editar Portada</span>
              </button>
            )}

            <button
              onClick={onOpenNewMatchModal}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Partido</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ÚLTIMO PARTIDO JUGADO (Tarjeta Destacada) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Último Partido Disputado
            </h2>
          </div>
          
          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
          >
            <span>Ver todo el historial</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestMatch ? (
          <div className="bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-slate-950 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition duration-300">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {latestMatch.date}
                </span>
                {latestMatch.court && (
                  <span className="text-xs text-slate-400 font-medium">
                    📍 {latestMatch.court}
                  </span>
                )}
              </div>

              {latestMatch.mvp && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold shadow-sm">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>MVP: {latestMatch.mvp}</span>
                </div>
              )}
            </div>

            {/* Scoreboard block */}
            <div className="py-5 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
              {/* Team 1 */}
              <div className={`p-4 rounded-2xl border transition ${
                latestMatch.winnerTeam === 1 
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-500/10' 
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {latestMatch.team1.name || 'Pareja 1'}
                  </span>
                  {latestMatch.winnerTeam === 1 && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-md flex items-center gap-1">
                      <Award className="w-3 h-3" /> GANADORES
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{latestMatch.team1.player1}</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{latestMatch.team1.player2}</span>
                  </div>
                </div>
              </div>

              {/* Set Score Display */}
              <div className="text-center py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Marcador Final
                </span>
                <div className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight font-mono">
                  {latestMatch.setsScore || 'En curso'}
                </div>
                {latestMatch.isCompleted === false && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded-md">
                    En Directo / Pendiente
                  </span>
                )}
              </div>

              {/* Team 2 */}
              <div className={`p-4 rounded-2xl border transition ${
                latestMatch.winnerTeam === 2 
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-500/10' 
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {latestMatch.team2.name || 'Pareja 2'}
                  </span>
                  {latestMatch.winnerTeam === 2 && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-md flex items-center gap-1">
                      <Award className="w-3 h-3" /> GANADORES
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>{latestMatch.team2.player1}</span>
                  </div>
                  <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>{latestMatch.team2.player2}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary & Key Highlight */}
            {latestMatch.summary && (
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed my-2">
                <span className="font-bold text-emerald-400 block mb-0.5">Resumen del Encuentro:</span>
                {latestMatch.summary}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{latestMatch.title}</span>
                {latestMatch.youtubeUrl && (
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <Video className="w-3 h-3" /> Vídeo
                  </span>
                )}
              </div>

              <button
                onClick={() => onInspectMatch(latestMatch)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Acta y Estadísticas Completas</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              🎾
            </div>
            <h3 className="text-base font-bold text-white">Aún no hay partidos en el circuito</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Registra el primer partido o impórtalo desde el menú para empezar a generar estadísticas y gráficos.
            </p>
            <button
              onClick={onOpenNewMatchModal}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Registrar Primer Partido
            </button>
          </div>
        )}
      </div>

      {/* 3. ACCESOS RÁPIDOS Y JUGADORES DESTACADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Jugadores del Circuito Preview */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black text-white">Jugadores del Circuito</h3>
            </div>
            <button
              onClick={() => onNavigateTab('players')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5"
            >
              <span>Explorar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {playerProfiles.slice(0, 6).map((p) => {
              const hist = playerHistories[p.name];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPlayerForDetail(p.name);
                    onNavigateTab('players');
                  }}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800/90 hover:border-slate-700 rounded-2xl text-left transition flex flex-col items-start gap-1.5 group cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                        style={{ backgroundColor: p.avatarColor || '#10b981' }}
                      >
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {p.preferredSide}
                      </div>
                    </div>
                  </div>
                  {hist && (
                    <div className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md w-full text-center">
                      {hist.winRate}% Vic ({hist.matchesPlayed}PJ)
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen & Métricas Clave */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-black text-white">Rendimiento del Circuito</h3>
            </div>
            <button
              onClick={() => onNavigateTab('charts')}
              className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
            >
              <span>Ver Gráficos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block">Total Partidos</span>
              <span className="text-xl font-black text-white">{totalMatchesCount}</span>
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block">Mejor % Victorias</span>
              <span className="text-sm font-black text-emerald-400 truncate block">
                {bestWinRatePlayer ? `${bestWinRatePlayer.name} (${bestWinRatePlayer.winRate}%)` : '-'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onNavigateTab('my-profile')}
              className="flex-1 py-2.5 px-3 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 text-cyan-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ver Mi Perfil</span>
            </button>
            <button
              onClick={() => onNavigateTab('qa')}
              className="flex-1 py-2.5 px-3 bg-pink-950/60 hover:bg-pink-900/60 border border-pink-800/80 text-pink-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preguntas IA</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
