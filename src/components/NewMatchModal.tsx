import React, { useState, useEffect } from 'react';
import { X, Plus, Trophy, Activity, Zap, AlertTriangle, ShieldAlert } from 'lucide-react';
import { PadelMatch, PlayerStats, PlayerProfile } from '../types';
import { MatchLineupSelector, MatchLineup } from './MatchLineupSelector';

interface NewMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMatch: (match: PadelMatch) => void;
  knownPlayers: string[];
  profiles: PlayerProfile[];
  onSaveNewProfile?: (profile: PlayerProfile) => void;
}

export const NewMatchModal: React.FC<NewMatchModalProps> = ({
  isOpen,
  onClose,
  onSaveMatch,
  knownPlayers,
  profiles,
  onSaveNewProfile
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState<string>('Partido de Pádel Amistoso');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [court, setCourt] = useState<string>('Pista 1');
  const [score, setScore] = useState<string>('6-4, 6-3');

  const [lineup, setLineup] = useState<MatchLineup>(() => {
    return {
      team1Player1: profiles[0]?.name || knownPlayers[0] || 'Álvaro',
      team1Player2: profiles[1]?.name || knownPlayers[1] || 'Carlos',
      team2Player1: profiles[2]?.name || knownPlayers[2] || 'Pablo',
      team2Player2: profiles[3]?.name || knownPlayers[3] || 'Marcos',
    };
  });

  const [stats, setStats] = useState<Record<string, PlayerStats>>({
    [lineup.team1Player1]: { touches: 75, forcedErrors: 5, unforcedErrors: 4, winners: 12 },
    [lineup.team1Player2]: { touches: 68, forcedErrors: 6, unforcedErrors: 7, winners: 8 },
    [lineup.team2Player1]: { touches: 85, forcedErrors: 4, unforcedErrors: 5, winners: 9 },
    [lineup.team2Player2]: { touches: 62, forcedErrors: 8, unforcedErrors: 9, winners: 5 },
  });

  const [summary, setSummary] = useState<string>('Partido muy disputado con puntos largos y buenas transiciones a la red.');
  const [mvp, setMvp] = useState<string>(lineup.team1Player1);

  // Sync stats keys if lineup players change
  useEffect(() => {
    setStats(prev => {
      const next = { ...prev };
      [lineup.team1Player1, lineup.team1Player2, lineup.team2Player1, lineup.team2Player2].forEach(p => {
        if (p && !next[p]) {
          next[p] = { touches: 50, forcedErrors: 5, unforcedErrors: 5, winners: 5 };
        }
      });
      return next;
    });
    if (![lineup.team1Player1, lineup.team1Player2, lineup.team2Player1, lineup.team2Player2].includes(mvp)) {
      setMvp(lineup.team1Player1);
    }
  }, [lineup]);

  const handleStatChange = (player: string, field: keyof PlayerStats, val: number) => {
    setStats(prev => ({
      ...prev,
      [player]: {
        ...(prev[player] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 }),
        [field]: Math.max(0, val)
      }
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const activePlayers = [
      lineup.team1Player1,
      lineup.team1Player2,
      lineup.team2Player1,
      lineup.team2Player2
    ];

    const matchStats: Record<string, PlayerStats> = {};
    activePlayers.forEach((p) => {
      matchStats[p] = stats[p] || { touches: 50, forcedErrors: 5, unforcedErrors: 5, winners: 5 };
    });

    const newMatch: PadelMatch = {
      id: `match-${Date.now()}`,
      title,
      date,
      court,
      team1: {
        name: `${lineup.team1Player1} & ${lineup.team1Player2}`,
        player1: lineup.team1Player1,
        player2: lineup.team1Player2,
      },
      team2: {
        name: `${lineup.team2Player1} & ${lineup.team2Player2}`,
        player1: lineup.team2Player1,
        player2: lineup.team2Player2,
      },
      setsScore: score,
      winnerTeam: 1,
      stats: matchStats,
      summary,
      highlights: [`Gran partido entre ${lineup.team1Player1}/${lineup.team1Player2} y ${lineup.team2Player1}/${lineup.team2Player2}`],
      mvp: mvp || lineup.team1Player1
    };

    onSaveMatch(newMatch);
    onClose();
  };

  const playersList = [lineup.team1Player1, lineup.team1Player2, lineup.team2Player1, lineup.team2Player2].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Plus className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                Registrar Partido Manualmente
              </h3>
              <p className="text-xs text-slate-400">
                Selecciona los perfiles oficiales para que las estadísticas se asignen con precisión
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Título del Partido</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Pista / Club</label>
              <input
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Resultado (Sets)</label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Lineup & Profiles Selection */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <MatchLineupSelector
              profiles={profiles}
              lineup={lineup}
              onChangeLineup={setLineup}
              onSaveNewProfile={onSaveNewProfile}
              title="Alineación del Partido (Perfiles Registrados)"
            />
          </div>

          {/* Stats Inputs */}
          <div>
            <h4 className="font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Estadísticas Individuales del Encuentro:</span>
              <span className="text-[10px] text-slate-500 font-normal">Toques, errores y definición por jugador</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playersList.map((pName, pIdx) => {
                const pStat = stats[pName] || { touches: 50, forcedErrors: 5, unforcedErrors: 5, winners: 5 };
                return (
                  <div key={`new-match-player-${pIdx}-${pName}`} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="font-bold text-emerald-400 mb-2 flex items-center justify-between">
                      <span>{pName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">P{pIdx < 2 ? 1 : 2}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Toques:</span>
                        <input
                          type="number"
                          value={pStat.touches}
                          onChange={(e) => handleStatChange(pName, 'touches', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">Winners:</span>
                        <input
                          type="number"
                          value={pStat.winners}
                          onChange={(e) => handleStatChange(pName, 'winners', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">Err. Forzados:</span>
                        <input
                          type="number"
                          value={pStat.forcedErrors}
                          onChange={(e) => handleStatChange(pName, 'forcedErrors', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">Err. No Forzados:</span>
                        <input
                          type="number"
                          value={pStat.unforcedErrors}
                          onChange={(e) => handleStatChange(pName, 'unforcedErrors', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Resumen del Partido</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Guardar Partido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
