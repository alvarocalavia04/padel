import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ArrowLeftRight, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  ChevronDown,
  Shield,
  Zap
} from 'lucide-react';
import { PlayerProfile } from '../types';
import { PlayerProfileModal } from './PlayerProfileModal';
import { getSideBadgeClass, getSideLabel } from '../utils/playerProfilesStorage';

export interface MatchLineup {
  team1Player1: string;
  team1Player2: string;
  team2Player1: string;
  team2Player2: string;
}

interface MatchLineupSelectorProps {
  profiles: PlayerProfile[];
  lineup: MatchLineup;
  onChangeLineup: (newLineup: MatchLineup) => void;
  onSaveNewProfile?: (newProfile: PlayerProfile) => void;
  title?: string;
  compact?: boolean;
}

export const MatchLineupSelector: React.FC<MatchLineupSelectorProps> = ({
  profiles,
  lineup,
  onChangeLineup,
  onSaveNewProfile,
  title = 'Selección de Jugadores por Perfil',
  compact = false
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [targetSlotForNewPlayer, setTargetSlotForNewPlayer] = useState<keyof MatchLineup | null>(null);

  // Helper to get profile by name
  const getProfile = (name: string): PlayerProfile | undefined => {
    return profiles.find(p => p.name.toLowerCase() === (name || '').toLowerCase());
  };

  // Check if player is selected in other slots
  const isPlayerSelectedElsewhere = (playerName: string, currentSlot: keyof MatchLineup): { isSelected: boolean; inSlotName?: string } => {
    if (!playerName) return { isSelected: false };
    const slots: Array<{ key: keyof MatchLineup; label: string }> = [
      { key: 'team1Player1', label: 'Pareja 1 - J1' },
      { key: 'team1Player2', label: 'Pareja 1 - J2' },
      { key: 'team2Player1', label: 'Pareja 2 - J1' },
      { key: 'team2Player2', label: 'Pareja 2 - J2' }
    ];

    for (const slot of slots) {
      if (slot.key !== currentSlot && lineup[slot.key]?.toLowerCase() === playerName.toLowerCase()) {
        return { isSelected: true, inSlotName: slot.label };
      }
    }
    return { isSelected: false };
  };

  const handleSelectPlayer = (slot: keyof MatchLineup, playerName: string) => {
    if (playerName === '__CREATE_NEW__') {
      setTargetSlotForNewPlayer(slot);
      setIsCreateModalOpen(true);
      return;
    }
    onChangeLineup({
      ...lineup,
      [slot]: playerName
    });
  };

  const handleSwapTeam1Positions = () => {
    onChangeLineup({
      ...lineup,
      team1Player1: lineup.team1Player2,
      team1Player2: lineup.team1Player1
    });
  };

  const handleSwapTeam2Positions = () => {
    onChangeLineup({
      ...lineup,
      team2Player1: lineup.team2Player2,
      team2Player2: lineup.team2Player1
    });
  };

  const handleSwapTeams = () => {
    onChangeLineup({
      team1Player1: lineup.team2Player1,
      team1Player2: lineup.team2Player2,
      team2Player1: lineup.team1Player1,
      team2Player2: lineup.team1Player2
    });
  };

  const handleCreatedProfile = (newProfile: PlayerProfile) => {
    if (onSaveNewProfile) {
      onSaveNewProfile(newProfile);
    }
    if (targetSlotForNewPlayer) {
      onChangeLineup({
        ...lineup,
        [targetSlotForNewPlayer]: newProfile.name
      });
    }
    setTargetSlotForNewPlayer(null);
  };

  // Check unique players count
  const selectedNames = [lineup.team1Player1, lineup.team1Player2, lineup.team2Player1, lineup.team2Player2].filter(Boolean);
  const uniqueNames = new Set(selectedNames.map(n => n.toLowerCase()));
  const hasDuplicates = selectedNames.length !== uniqueNames.size;

  // Render individual player dropdown selector
  const renderPlayerSlot = (
    slotKey: keyof MatchLineup,
    slotTitle: string,
    defaultSideHint: string,
    teamColor: 'team1' | 'team2'
  ) => {
    const selectedName = lineup[slotKey];
    const profile = getProfile(selectedName);

    return (
      <div className="space-y-1.5 flex-1 min-w-[140px]">
        <div className="flex items-center justify-between text-[11px]">
          <span className={`font-bold ${teamColor === 'team1' ? 'text-cyan-300' : 'text-amber-300'}`}>
            {slotTitle}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {defaultSideHint}
          </span>
        </div>

        <div className="relative">
          <select
            value={selectedName || ''}
            onChange={(e) => handleSelectPlayer(slotKey, e.target.value)}
            className={`w-full appearance-none bg-slate-950 border rounded-xl p-2.5 pr-8 text-xs font-bold text-white transition focus:outline-none cursor-pointer ${
              teamColor === 'team1'
                ? 'border-cyan-800/60 focus:border-cyan-400 bg-cyan-950/20'
                : 'border-amber-800/60 focus:border-amber-400 bg-amber-950/20'
            }`}
          >
            <option value="" disabled>-- Selecciona un perfil --</option>
            {profiles.map(p => {
              const check = isPlayerSelectedElsewhere(p.name, slotKey);
              return (
                <option
                  key={`opt-${slotKey}-${p.id}`}
                  value={p.name}
                  disabled={check.isSelected}
                  className="bg-slate-900 text-slate-100 py-1"
                >
                  {p.name} {p.nickname ? `(${p.nickname})` : ''} — [{getSideLabel(p.preferredSide)}] {check.isSelected ? `⚠️ En ${check.inSlotName}` : ''}
                </option>
              );
            })}
            <option value="__CREATE_NEW__" className="bg-emerald-950 text-emerald-300 font-bold">
              ➕ Crear nuevo perfil de jugador...
            </option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
        </div>

        {/* Selected player preview badge */}
        {profile ? (
          <div className="p-2 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 truncate">
              <div
                className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white shadow"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {profile.name.charAt(0)}
              </div>
              <span className="font-bold text-slate-200 truncate">{profile.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${getSideBadgeClass(profile.preferredSide)}`}>
                {profile.preferredSide === 'drive' ? 'Drive' : profile.preferredSide === 'reves' ? 'Revés' : 'Ambos'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                {profile.dominantHand === 'zurdo' ? '⚡ Zurdo' : 'Diestro'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-[10px] text-slate-500 italic text-center">
            Sin jugador asignado
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Users className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              {title}
            </h4>
            <p className="text-[10px] text-slate-400">
              Selecciona los 4 perfiles registrados para evitar duplicados y errores ortográficos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSwapTeams}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Intercambiar Pareja 1 por Pareja 2"
          >
            <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
            <span>Invertir Parejas (P1 ↔ P2)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetSlotForNewPlayer(null);
              setIsCreateModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3 h-3" />
            <span>+ Nuevo Perfil</span>
          </button>
        </div>
      </div>

      {/* Warnings & Validation Badges */}
      {hasDuplicates && (
        <div className="p-2.5 bg-rose-950/70 border border-rose-600/70 rounded-xl text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Has seleccionado al mismo jugador más de una vez. Cada uno de los 4 puestos debe tener un jugador distinto.</span>
        </div>
      )}

      {/* Lineup Dual Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TEAM 1 (Pareja 1) */}
        <div className="p-4 bg-slate-900/90 border-2 border-cyan-800/60 rounded-2xl space-y-3 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-700/60 text-cyan-300 text-[10px] font-black rounded-md font-mono">
                PAREJA 1
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[150px]">
                {lineup.team1Player1 && lineup.team1Player2 ? `${lineup.team1Player1} & ${lineup.team1Player2}` : 'Configurando...'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSwapTeam1Positions}
              className="p-1 bg-slate-800 hover:bg-cyan-900 text-slate-300 hover:text-cyan-300 rounded-lg text-[10px] transition flex items-center gap-1 border border-slate-700"
              title="Invertir posiciones de J1 y J2 en Pareja 1"
            >
              <RotateCw className="w-3 h-3" />
              <span>Cambiar Lados</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderPlayerSlot('team1Player1', 'Jugador 1', 'Drive / Revés', 'team1')}
            {renderPlayerSlot('team1Player2', 'Jugador 2', 'Drive / Revés', 'team1')}
          </div>
        </div>

        {/* TEAM 2 (Pareja 2) */}
        <div className="p-4 bg-slate-900/90 border-2 border-amber-800/60 rounded-2xl space-y-3 shadow-lg shadow-amber-950/20">
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-950 border border-amber-700/60 text-amber-300 text-[10px] font-black rounded-md font-mono">
                PAREJA 2
              </span>
              <span className="text-xs font-bold text-white truncate max-w-[150px]">
                {lineup.team2Player1 && lineup.team2Player2 ? `${lineup.team2Player1} & ${lineup.team2Player2}` : 'Configurando...'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSwapTeam2Positions}
              className="p-1 bg-slate-800 hover:bg-amber-900 text-slate-300 hover:text-amber-300 rounded-lg text-[10px] transition flex items-center gap-1 border border-slate-700"
              title="Invertir posiciones de J1 y J2 en Pareja 2"
            >
              <RotateCw className="w-3 h-3" />
              <span>Cambiar Lados</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {renderPlayerSlot('team2Player1', 'Jugador 1', 'Drive / Revés', 'team2')}
            {renderPlayerSlot('team2Player2', 'Jugador 2', 'Drive / Revés', 'team2')}
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      <PlayerProfileModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTargetSlotForNewPlayer(null);
        }}
        onSave={handleCreatedProfile}
        existingProfiles={profiles}
      />
    </div>
  );
};
