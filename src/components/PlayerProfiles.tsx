import React, { useState, useEffect } from 'react';
import { 
  User, 
  Trophy, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Target, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  Zap, 
  Activity, 
  Share2, 
  Check, 
  RefreshCw, 
  Loader2,
  Award,
  MessageSquare,
  UserPlus,
  Edit3,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { PlayerHistorySummary, PlayerTacticalProfile, PlayerProfile } from '../types';
import { generateLocalPlayerProfiles, getPlayerColor } from '../utils/statsCalculator';
import { PlayerProfileModal } from './PlayerProfileModal';
import { getSideBadgeClass, getSideLabel } from '../utils/playerProfilesStorage';

interface PlayerProfilesProps {
  playerHistories: PlayerHistorySummary[];
  storedProfiles?: PlayerProfile[];
  onSaveProfile?: (profile: PlayerProfile) => void;
  onDeleteProfile?: (profileId: string, playerName: string) => void;
  onSelectPlayerForCharts?: (playerName: string) => void;
  onAskAboutPlayer?: (playerName: string) => void;
}

export const PlayerProfiles: React.FC<PlayerProfilesProps> = ({ 
  playerHistories,
  storedProfiles = [],
  onSaveProfile,
  onDeleteProfile,
  onSelectPlayerForCharts,
  onAskAboutPlayer
}) => {
  const [profiles, setProfiles] = useState<PlayerTacticalProfile[]>([]);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [copiedPlayer, setCopiedPlayer] = useState<string | null>(null);

  // Profile Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<PlayerProfile | null>(null);

  // Initialize profiles
  useEffect(() => {
    if (playerHistories.length > 0) {
      const generated = generateLocalPlayerProfiles(playerHistories);
      setProfiles(generated);
      if (!selectedPlayerName || !playerHistories.some(p => p.name === selectedPlayerName)) {
        setSelectedPlayerName(playerHistories[0].name);
      }
    }
  }, [playerHistories]);

  // Request fresh AI enhanced profiles from server
  const handleFetchAIProfiles = async () => {
    if (playerHistories.length === 0) return;
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/player-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerHistories })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProfiles(data);
          return;
        }
      }
      // Fallback
      setProfiles(generateLocalPlayerProfiles(playerHistories));
    } catch (e) {
      console.warn('Fallback to local profiles engine:', e);
      setProfiles(generateLocalPlayerProfiles(playerHistories));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const activeProfile = profiles.find(p => p.name === selectedPlayerName) || profiles[0];
  const activeStats = playerHistories.find(p => p.name === selectedPlayerName);
  const activeStoredProfile = storedProfiles.find(p => p.name.toLowerCase() === selectedPlayerName.toLowerCase());

  const handleCopyProfile = (profile: PlayerTacticalProfile) => {
    const text = `🎾 *PERFIL TÁCTICO: ${profile.name.toUpperCase()}* 🎾\n` +
      `⭐ Nivel General: ${profile.overallRating}/99 | Arquetipo: ${profile.archetype}\n` +
      `📌 *Lema:* "${profile.archetypeTagline}"\n\n` +
      `💪 *Puntos Fuertes:*\n${profile.strengths.map(s => `• ${s}`).join('\n')}\n\n` +
      `⚠️ *Áreas de Mejora:*\n${profile.weaknesses.map(w => `• ${w}`).join('\n')}\n\n` +
      `💡 *Consejo del Entrenador:* ${profile.tacticalAdvice}\n` +
      `🤝 *Pareja Ideal:* ${profile.recommendedPartner} (${profile.partnerSynergyReason})\n\n` +
      `🏆 *Veredicto:* ${profile.coachVerdict}`;

    navigator.clipboard.writeText(text);
    setCopiedPlayer(profile.name);
    setTimeout(() => setCopiedPlayer(null), 3000);
  };

  const handleOpenEdit = (profile: PlayerProfile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setIsModalOpen(true);
  };

  const handleSavedProfile = (saved: PlayerProfile) => {
    if (onSaveProfile) {
      onSaveProfile(saved);
    }
    setSelectedPlayerName(saved.name);
  };

  return (
    <div id="player-profiles-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <User className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Perfiles Oficiales & Diagnóstico Táctico
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Gestiona los perfiles canónicos de los jugadores para seleccionarlos sin errores tipográficos en los partidos y consulta su diagnóstico técnico detallado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Registrar Jugador</span>
          </button>

          {playerHistories.length > 0 && (
            <button
              type="button"
              onClick={handleFetchAIProfiles}
              disabled={isLoadingAI}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              {isLoadingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Diagnóstico IA</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stored Registered Profiles Carousel / List */}
      {storedProfiles.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Perfiles Registrados en el Sistema ({storedProfiles.length})
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Disponibles automáticamente en la selección de partidos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {storedProfiles.map((sp) => {
              const isSelected = sp.name.toLowerCase() === selectedPlayerName.toLowerCase();
              const history = playerHistories.find(h => h.name.toLowerCase() === sp.name.toLowerCase());

              return (
                <div
                  key={`stored-prof-${sp.id}`}
                  onClick={() => setSelectedPlayerName(sp.name)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-850 border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shadow overflow-hidden border border-slate-700/80 shrink-0"
                        style={{ backgroundColor: sp.avatarColor }}
                      >
                        {sp.avatarUrl ? (
                          <img src={sp.avatarUrl} alt={sp.name} className="w-full h-full object-cover" />
                        ) : (
                          sp.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{sp.name}</span>
                          {sp.nickname && (
                            <span className="text-[10px] text-amber-400 font-normal">"{sp.nickname}"</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${getSideBadgeClass(sp.preferredSide)}`}>
                            {getSideLabel(sp.preferredSide)}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 font-mono">
                            {sp.dominantHand === 'zurdo' ? '⚡ Zurdo' : 'Diestro'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(sp);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
                      title="Editar perfil"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {history ? (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{history.matchesPlayed}P ({history.winRate}% V)</span>
                      <span className="text-rose-400 font-bold">{history.unforcedErrorPerTouchPct}% ENF/T</span>
                      <span className="text-emerald-400 font-bold">{history.totalWinners} Win</span>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 italic">
                      Sin partidos jugados aún
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tactical Profile Details Section */}
      {playerHistories.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-3">
          <User className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">No hay partidos jugados registrados</h3>
          <p className="text-xs">
            Selecciona los perfiles creados al iniciar un partido para ver aquí sus estadísticas cronológicas, % ENF/Toque y análisis táctico.
          </p>
        </div>
      ) : activeProfile && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          {/* Active Player Card Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl ring-4 ring-slate-800 overflow-hidden border border-slate-700/80 shrink-0"
                style={{ backgroundColor: activeStoredProfile?.avatarColor || getPlayerColor(activeProfile.name) }}
              >
                {activeStoredProfile?.avatarUrl ? (
                  <img src={activeStoredProfile.avatarUrl} alt={activeProfile.name} className="w-full h-full object-cover" />
                ) : (
                  activeProfile.name.charAt(0)
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {activeProfile.name}
                  </h3>
                  {activeStoredProfile?.nickname && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      "{activeStoredProfile.nickname}"
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    {activeProfile.archetype}
                  </span>
                  {activeStoredProfile && (
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getSideBadgeClass(activeStoredProfile.preferredSide)}`}>
                      Posición: {getSideLabel(activeStoredProfile.preferredSide)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 italic mt-1">
                  "{activeProfile.archetypeTagline}"
                </p>
                {activeStoredProfile?.notes && (
                  <p className="text-[11px] text-slate-400 mt-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    💡 <strong>Notas de juego:</strong> {activeStoredProfile.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Overall Rating Box */}
            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 self-stretch sm:self-auto justify-center">
              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Rating General</div>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">{activeProfile.overallRating}</div>
              </div>
              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Partidos</div>
                <div className="text-2xl font-black text-white mt-0.5">{activeStats?.matchesPlayed || 0}</div>
              </div>
              <div className="text-center px-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold">% Victorias</div>
                <div className="text-2xl font-black text-cyan-400 mt-0.5">{activeStats?.winRate || 0}%</div>
              </div>
            </div>
          </div>

          {/* Key Metric Highlights (% ENF / Toque, Winner Ratio, Differential) */}
          {activeStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-rose-900/40">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>% ENF / Toque</span>
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-black text-rose-400 mt-1 font-mono">
                  {activeStats.unforcedErrorPerTouchPct}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  1 error cada ~{activeStats.touchesPerUnforcedError} toques
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-900/40">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Winners / Partido</span>
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
                  {activeStats.avgWinners}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Total: {activeStats.totalWinners} puntos ganadores
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-cyan-900/40">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Volumen / Toques</span>
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-black text-cyan-400 mt-1 font-mono">
                  {activeStats.avgTouches}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Total: {activeStats.totalTouches} toques acumulados
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-purple-900/40">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Diferencial Neto</span>
                  <Trophy className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-black text-purple-400 mt-1 font-mono">
                  {activeStats.netDifferential > 0 ? `+${activeStats.netDifferential}` : activeStats.netDifferential}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Winners menos Errores No Forzados
                </div>
              </div>
            </div>
          )}

          {/* Detailed Tactical Advice & Synergy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths & Weaknesses */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Fortalezas Principales
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {activeProfile.strengths.map((s, idx) => (
                  <li key={`str-${idx}`} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>

              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 pt-2 border-t border-slate-800">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Áreas de Mejora
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {activeProfile.weaknesses.map((w, idx) => (
                  <li key={`wk-${idx}`} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">⚠️</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coach Verdict & Ideal Partner */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-cyan-400" />
                  Consejo del Entrenador
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {activeProfile.tacticalAdvice}
                </p>

                <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Pareja Recomendada</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {activeProfile.recommendedPartner}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {activeProfile.partnerSynergyReason}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
                {onAskAboutPlayer && (
                  <button
                    type="button"
                    onClick={() => onAskAboutPlayer(activeProfile.name)}
                    className="px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white text-xs font-bold rounded-xl border border-indigo-500/40 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Preguntar IA</span>
                  </button>
                )}

                {onSelectPlayerForCharts && (
                  <button
                    type="button"
                    onClick={() => onSelectPlayerForCharts(activeProfile.name)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ver Evolución</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyProfile(activeProfile)}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 ml-auto"
                >
                  {copiedPlayer === activeProfile.name ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Create / Edit Modal */}
      <PlayerProfileModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSavedProfile}
        onDelete={onDeleteProfile}
        initialProfile={editingProfile}
        existingProfiles={storedProfiles}
      />
    </div>
  );
};
