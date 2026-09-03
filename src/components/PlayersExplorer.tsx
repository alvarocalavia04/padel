import React, { useState } from 'react';
import {
  Users,
  ChevronDown,
  UserCheck,
  Trophy,
  Target,
  Zap,
  Activity,
  Edit3,
  Trash2,
  Plus,
  Shield,
  Search,
  Sparkles,
  BarChart2,
  Calendar
} from 'lucide-react';
import { PlayerProfile, PlayerHistorySummary, PadelMatch } from '../types';
import { PlayerProfileModal } from './PlayerProfileModal';

interface PlayersExplorerProps {
  playerProfiles: PlayerProfile[];
  playerHistories: Record<string, PlayerHistorySummary>;
  matches: PadelMatch[];
  selectedPlayerName?: string;
  onSelectPlayer: (playerName: string) => void;
  onSaveProfile: (profile: PlayerProfile) => void;
  onDeleteProfile: (profileId: string, playerName: string) => void;
  isAdmin: boolean;
  onInspectMatch: (match: PadelMatch) => void;
}

export const PlayersExplorer: React.FC<PlayersExplorerProps> = ({
  playerProfiles,
  playerHistories,
  matches,
  selectedPlayerName,
  onSelectPlayer,
  onSaveProfile,
  onDeleteProfile,
  isAdmin,
  onInspectMatch
}) => {
  const [activePlayer, setActivePlayer] = useState<string>(
    selectedPlayerName || (playerProfiles[0]?.name || 'Álvaro')
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PlayerProfile | null>(null);
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);

  const currentProfile = playerProfiles.find(
    p => p.name.toLowerCase() === activePlayer.toLowerCase()
  ) || playerProfiles[0];

  const currentHistory = currentProfile ? playerHistories[currentProfile.name] : null;

  // Filter matches for current player
  const playerMatches = currentProfile
    ? matches.filter(m => {
        const isP1 = m.team1?.player1?.toLowerCase() === currentProfile.name.toLowerCase() || m.team1?.player2?.toLowerCase() === currentProfile.name.toLowerCase();
        const isP2 = m.team2?.player1?.toLowerCase() === currentProfile.name.toLowerCase() || m.team2?.player2?.toLowerCase() === currentProfile.name.toLowerCase();
        return isP1 || isP2;
      })
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP PLAYER SELECTOR DROPDOWN */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0d1628] to-slate-900 border border-slate-700/90 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>Explorador de Jugadores</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Elige el jugador que deseas consultar:
            </h2>
          </div>

          {/* Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full sm:w-auto min-w-[240px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border-2 border-emerald-500/60 rounded-2xl flex items-center justify-between gap-3 text-white transition shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {currentProfile?.avatarUrl ? (
                  <img
                    src={currentProfile.avatarUrl}
                    alt={currentProfile.name}
                    className="w-7 h-7 rounded-xl object-cover border border-emerald-500"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white"
                    style={{ backgroundColor: currentProfile?.avatarColor || '#10b981' }}
                  >
                    {currentProfile?.name.charAt(0)}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-black text-white flex items-center gap-1">
                    <span>{currentProfile?.name}</span>
                    <span className="text-[10px] text-emerald-400 font-normal">
                      ({currentProfile?.preferredSide})
                    </span>
                  </div>
                </div>
              </div>

              <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {isDropdownOpen && (
              <>
                <div
                  onClick={() => setIsDropdownOpen(false)}
                  className="fixed inset-0 z-20"
                />
                <div className="absolute right-0 top-full mt-2 w-full sm:w-72 bg-[#0a1120] border border-slate-700 rounded-2xl shadow-2xl z-30 py-2 space-y-1 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Jugadores del Circuito
                  </div>
                  {playerProfiles.map((p) => {
                    const isSelected = p.name.toLowerCase() === activePlayer.toLowerCase();
                    const hist = playerHistories[p.name];

                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setActivePlayer(p.name);
                          onSelectPlayer(p.name);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/70 text-emerald-300 font-bold'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              className="w-6 h-6 rounded-lg object-cover"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
                              style={{ backgroundColor: p.avatarColor || '#10b981' }}
                            >
                              {p.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs">{p.name}</span>
                        </div>

                        {hist && (
                          <span className="text-[10px] text-slate-400">
                            {hist.winRate}% Vic ({hist.matchesPlayed}PJ)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* 2. SELECTED PLAYER DOSSIER CARD */}
      {currentProfile && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              {currentProfile.avatarUrl ? (
                <img
                  src={currentProfile.avatarUrl}
                  alt={currentProfile.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 shadow-lg"
                  style={{ borderColor: currentProfile.avatarColor || '#10b981' }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg"
                  style={{ backgroundColor: currentProfile.avatarColor || '#10b981' }}
                >
                  {currentProfile.name.charAt(0)}
                </div>
              )}

              <div>
                <h3 className="text-xl font-black text-white">
                  {currentProfile.name}
                </h3>
                <div className="text-xs font-semibold text-emerald-400">
                  {currentProfile.nickname || 'Jugador Registrado'}
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span>Posición: <strong className="text-white capitalize">{currentProfile.preferredSide}</strong></span>
                  <span>•</span>
                  <span>Mano: <strong className="text-white capitalize">{currentProfile.dominantHand}</strong></span>
                </div>
              </div>
            </div>

            {/* Admin actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingProfile(currentProfile)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Editar Ficha</span>
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => {
                    if (window.confirm(`¿Seguro que deseas eliminar a ${currentProfile.name}?`)) {
                      onDeleteProfile(currentProfile.id, currentProfile.name);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-xs font-bold rounded-xl transition cursor-pointer"
                  title="Eliminar jugador"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block">Victorias</span>
              <span className="text-lg font-black text-white">
                {currentHistory ? `${currentHistory.winRate}%` : '0%'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {currentHistory ? `${currentHistory.matchesWon} de ${currentHistory.matchesPlayed}` : '0 PJ'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block">% ENF / Toque</span>
              <span className="text-lg font-black text-emerald-400">
                {currentHistory ? `${currentHistory.unforcedErrorPerTouchPct.toFixed(1)}%` : '0%'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {currentHistory ? `1 fallo / ${currentHistory.touchesPerUnforcedError.toFixed(1)} toques` : '-'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block">Winners</span>
              <span className="text-lg font-black text-cyan-300">
                {currentHistory?.totalWinners || 0}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {currentHistory ? `Media ${currentHistory.avgWinners.toFixed(1)}/P` : '-'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-semibold block">Toques Totales</span>
              <span className="text-lg font-black text-purple-300">
                {currentHistory?.totalTouches || 0}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {currentHistory ? `Media ${currentHistory.avgTouches.toFixed(0)}/P` : '-'}
              </span>
            </div>
          </div>

          {/* Notes */}
          {currentProfile.notes && (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-300">
              <span className="font-bold text-slate-400 block mb-0.5">Informe Técnico:</span>
              {currentProfile.notes}
            </div>
          )}

          {/* Matches List for this player */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Partidos de {currentProfile.name}
            </h4>
            {playerMatches.length > 0 ? (
              <div className="space-y-2">
                {playerMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onInspectMatch(m)}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white">{m.title}</span>
                      <span className="text-slate-400 text-[11px] block">{m.date} • {m.setsScore}</span>
                    </div>
                    <span className="text-emerald-400 font-bold">Ver Acta →</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Sin partidos registrados aún.</p>
            )}
          </div>

        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <PlayerProfileModal
          isOpen={Boolean(editingProfile)}
          profile={editingProfile}
          onSave={(updated) => {
            onSaveProfile(updated);
            setEditingProfile(null);
          }}
          onClose={() => setEditingProfile(null)}
        />
      )}

      {/* Create New Profile Modal */}
      {isNewProfileModalOpen && (
        <PlayerProfileModal
          isOpen={isNewProfileModalOpen}
          profile={{
            id: `profile-${Date.now()}`,
            name: '',
            nickname: '',
            avatarColor: '#10b981',
            preferredSide: 'ambos',
            dominantHand: 'diestro',
            createdAt: new Date().toISOString().split('T')[0]
          }}
          onSave={(created) => {
            onSaveProfile(created);
            setIsNewProfileModalOpen(false);
          }}
          onClose={() => setIsNewProfileModalOpen(false)}
        />
      )}

    </div>
  );
};
