import React from 'react';
import { 
  Trophy, 
  Flame, 
  Users, 
  Sparkles, 
  Palette, 
  Activity, 
  Zap, 
  Shield, 
  Camera,
  Calendar
} from 'lucide-react';
import { ClubThemeConfig, PlayerHistorySummary, PadelMatch, PlayerProfile } from '../types';

interface ClubHeroBannerProps {
  config: ClubThemeConfig;
  onOpenCustomizer: () => void;
  matches: PadelMatch[];
  playerHistories: PlayerHistorySummary[];
  playerProfiles: PlayerProfile[];
}

export const ClubHeroBanner: React.FC<ClubHeroBannerProps> = ({
  config,
  onOpenCustomizer,
  matches,
  playerHistories,
  playerProfiles
}) => {
  // Compute top leaders
  const topWinner = [...playerHistories].sort((a, b) => b.totalWinners - a.totalWinners)[0];
  const topWinRate = [...playerHistories].filter(p => p.matchesPlayed >= 1).sort((a, b) => b.winRate - a.winRate)[0];
  const totalTouches = playerHistories.reduce((acc, p) => acc + p.totalTouches, 0);

  const neonAccentColor = () => {
    switch (config.neonTheme) {
      case 'cyan': return 'from-cyan-500 to-blue-600 border-cyan-500/40 text-cyan-400';
      case 'amber': return 'from-amber-400 to-orange-500 border-amber-500/40 text-amber-400';
      case 'purple': return 'from-purple-500 to-pink-600 border-purple-500/40 text-purple-400';
      case 'red': return 'from-rose-500 to-red-600 border-rose-500/40 text-rose-400';
      default: return 'from-emerald-400 to-teal-500 border-emerald-500/40 text-emerald-400';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 shadow-2xl bg-slate-950">
      {/* Background Banner Image or Gradient Mesh */}
      {config.bannerImageUrl ? (
        <div className="absolute inset-0 z-0">
          <img
            src={config.bannerImageUrl}
            alt="Club Banner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-75 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080c14]/95 via-[#080c14]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-transparent to-transparent opacity-80" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-slate-950">
          {/* Subtle court line markings in SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="2" strokeDasharray="8 8" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="2" />
            <rect x="20%" y="15%" width="60%" height="70%" fill="none" stroke="white" strokeWidth="2" />
          </svg>
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Club Brand & Info */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-900/90 border border-slate-700/80 text-emerald-400 shadow-sm backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PadelStats Pro Club
            </span>

            {config.bannerImageUrl && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 border border-slate-700 text-slate-300">
                <Camera className="w-3 h-3 text-emerald-400" />
                Foto de Grupo Activa
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
              {config.clubName || 'Circuito Pádel Pro'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium max-w-xl drop-shadow">
              {config.clubTagline || 'Análisis de rendimiento, marcador en directo y evolución técnica de cada jugador.'}
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Partidos:</span>
              <span className="font-mono font-bold text-white">{matches.length}</span>
            </div>

            <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Jugadores:</span>
              <span className="font-mono font-bold text-white">{playerProfiles.length}</span>
            </div>

            {totalTouches > 0 && (
              <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Toques de Bola:</span>
                <span className="font-mono font-bold text-amber-300">{totalTouches}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Leaders + Customize Button */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 w-full sm:w-auto">
          
          {/* Customizer Button */}
          <button
            id="btn-open-club-theme-modal"
            type="button"
            onClick={onOpenCustomizer}
            className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800/90 text-slate-100 text-xs font-bold rounded-2xl border border-emerald-500/40 hover:border-emerald-400 transition flex items-center justify-center gap-2 shadow-lg backdrop-blur-md cursor-pointer group"
          >
            <Palette className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition duration-200" />
            <span>🎨 Personalizar Club & Fotos</span>
          </button>

          {/* Leaders Quick Card */}
          {(topWinner || topWinRate) && (
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 text-xs shadow-inner">
              {topWinRate && (
                <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Líder Victorias</div>
                    <div className="font-black text-white">{topWinRate.name} <span className="text-emerald-400 font-mono">({topWinRate.winRate}%)</span></div>
                  </div>
                </div>
              )}

              {topWinner && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Líder Winners</div>
                    <div className="font-black text-white">{topWinner.name} <span className="text-cyan-400 font-mono">({topWinner.totalWinners})</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
