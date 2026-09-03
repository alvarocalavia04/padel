import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Award, 
  Flame,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import { PadelMatch } from '../types';
import { getPlayerColor } from '../utils/statsCalculator';

interface EditMatchResultModalProps {
  match: PadelMatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMatch: PadelMatch) => void;
}

export const EditMatchResultModal: React.FC<EditMatchResultModalProps> = ({
  match,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen || !match) return null;

  // Form states initialized with match values
  const [setsScoreText, setSetsScoreText] = useState<string>(match.setsScore || '');
  const [winnerTeam, setWinnerTeam] = useState<1 | 2 | undefined>(match.winnerTeam);
  const [isCompleted, setIsCompleted] = useState<boolean>(match.isCompleted !== false);
  const [mvp, setMvp] = useState<string>(match.mvp || '');
  
  // Set-by-set builder helper states
  const [useSetBuilder, setUseSetBuilder] = useState<boolean>(true);
  const [set1Team1, setSet1Team1] = useState<string>('');
  const [set1Team2, setSet1Team2] = useState<string>('');
  const [set2Team1, setSet2Team1] = useState<string>('');
  const [set2Team2, setSet2Team2] = useState<string>('');
  const [hasSet3, setHasSet3] = useState<boolean>(false);
  const [set3Team1, setSet3Team1] = useState<string>('');
  const [set3Team2, setSet3Team2] = useState<string>('');

  // Extract players
  const team1Players = [match.team1?.player1, match.team1?.player2].filter(Boolean) as string[];
  const team2Players = [match.team2?.player1, match.team2?.player2].filter(Boolean) as string[];
  const team1DisplayName = match.team1?.name || (team1Players.join(' & ') || 'Pareja 1');
  const team2DisplayName = match.team2?.name || (team2Players.join(' & ') || 'Pareja 2');
  const allMatchPlayers = [...team1Players, ...team2Players];

  // Parse existing setsScore on open
  useEffect(() => {
    if (match) {
      setSetsScoreText(match.setsScore || '');
      setWinnerTeam(match.winnerTeam);
      setIsCompleted(match.isCompleted !== false);
      setMvp(match.mvp || '');

      // Try to parse existing setsScore like "6-4, 3-6, 7-5"
      const raw = match.setsScore || '';
      const setParts = raw.split(',').map(s => s.trim()).filter(Boolean);
      
      if (setParts.length >= 1 && setParts[0].includes('-')) {
        const [s1t1, s1t2] = setParts[0].split('-').map(x => x.trim());
        setSet1Team1(s1t1 || '');
        setSet1Team2(s1t2 || '');
      } else {
        setSet1Team1('');
        setSet1Team2('');
      }

      if (setParts.length >= 2 && setParts[1].includes('-')) {
        const [s2t1, s2t2] = setParts[1].split('-').map(x => x.trim());
        setSet2Team1(s2t1 || '');
        setSet2Team2(s2t2 || '');
      } else {
        setSet2Team1('');
        setSet2Team2('');
      }

      if (setParts.length >= 3 && setParts[2].includes('-')) {
        const [s3t1, s3t2] = setParts[2].split('-').map(x => x.trim());
        setHasSet3(true);
        setSet3Team1(s3t1 || '');
        setSet3Team2(s3t2 || '');
      } else {
        setHasSet3(false);
        setSet3Team1('');
        setSet3Team2('');
      }
    }
  }, [match]);

  // Update setsScoreText whenever builder inputs change (if builder mode is on)
  const syncFromBuilder = (s1_1: string, s1_2: string, s2_1: string, s2_2: string, includeS3: boolean, s3_1: string, s3_2: string) => {
    const parts: string[] = [];
    if (s1_1 !== '' && s1_2 !== '') {
      parts.push(`${s1_1}-${s1_2}`);
    }
    if (s2_1 !== '' && s2_2 !== '') {
      parts.push(`${s2_1}-${s2_2}`);
    }
    if (includeS3 && s3_1 !== '' && s3_2 !== '') {
      parts.push(`${s3_1}-${s3_2}`);
    }
    if (parts.length > 0) {
      setSetsScoreText(parts.join(', '));
      
      // Auto-suggest winner if clear
      let t1Sets = 0;
      let t2Sets = 0;
      if (parseInt(s1_1) > parseInt(s1_2)) t1Sets++;
      else if (parseInt(s1_2) > parseInt(s1_1)) t2Sets++;

      if (parseInt(s2_1) > parseInt(s2_2)) t1Sets++;
      else if (parseInt(s2_2) > parseInt(s2_1)) t2Sets++;

      if (includeS3) {
        if (parseInt(s3_1) > parseInt(s3_2)) t1Sets++;
        else if (parseInt(s3_2) > parseInt(s3_1)) t2Sets++;
      }

      if (t1Sets > t2Sets && t1Sets >= 2) {
        setWinnerTeam(1);
        setIsCompleted(true);
      } else if (t2Sets > t1Sets && t2Sets >= 2) {
        setWinnerTeam(2);
        setIsCompleted(true);
      }
    }
  };

  const handleSave = () => {
    if (!match) return;

    const updated: PadelMatch = {
      ...match,
      setsScore: setsScoreText.trim() || match.setsScore,
      winnerTeam: winnerTeam,
      isCompleted: isCompleted,
      mvp: mvp.trim()
      // NOTE: match.stats, match.pointRallies, match.pointEvents, match.audioNotes, match.inProgressScoreboard are kept 100% UNTOUCHED
    };

    onSave(updated);
    onClose();
  };

  // Calculate stats summary to reassure user
  const totalTouchesInMatch = Object.values(match.stats || {}).reduce((acc: number, curr: any) => acc + (curr?.touches || 0), 0);
  const totalWinnersInMatch = Object.values(match.stats || {}).reduce((acc: number, curr: any) => acc + (curr?.winners || 0), 0);
  const totalErrorsInMatch = Object.values(match.stats || {}).reduce((acc: number, curr: any) => acc + (curr?.unforcedErrors || 0) + (curr?.forcedErrors || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100">
        
        {/* Header */}
        <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <Trophy className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Actualizar Resultado Final & Balance V/D
              </span>
            </div>
            <h3 className="text-xl font-black text-white">{match.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {match.date}
              </span>
              {match.court && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {match.court}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Reassurance Banner */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-200/90 leading-relaxed">
              <span className="font-bold text-emerald-300">Estadísticas registradas 100% protegidas:</span> Los datos grabados de este partido ({totalTouchesInMatch} toques, {totalWinnersInMatch} winners, {totalErrorsInMatch} errores) se mantienen intactos. Solo se ajusta el resultado final oficial de sets y los ganadores para reflejar las Victorias/Derrotas (V/D) reales en el historial y perfiles.
            </div>
          </div>

          {/* 1. Sets Score Section */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Resultado Oficial de Sets</span>
              </label>
              <button
                type="button"
                onClick={() => setUseSetBuilder(!useSetBuilder)}
                className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
              >
                {useSetBuilder ? 'Editar texto libre directo' : 'Usar casillas de Sets'}
              </button>
            </div>

            {useSetBuilder ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Set 1 */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 mb-2">Set 1</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 truncate mb-1">{team1DisplayName}</div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={set1Team1}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSet1Team1(val);
                            syncFromBuilder(val, set1Team2, set2Team1, set2Team2, hasSet3, set3Team1, set3Team2);
                          }}
                          placeholder="6"
                          className="w-full bg-slate-950 border border-slate-700 text-center font-bold text-emerald-400 text-base py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <span className="text-slate-600 font-bold mt-4">-</span>
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 truncate mb-1">{team2DisplayName}</div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={set1Team2}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSet1Team2(val);
                            syncFromBuilder(set1Team1, val, set2Team1, set2Team2, hasSet3, set3Team1, set3Team2);
                          }}
                          placeholder="4"
                          className="w-full bg-slate-950 border border-slate-700 text-center font-bold text-emerald-400 text-base py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Set 2 */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 mb-2">Set 2</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 truncate mb-1">{team1DisplayName}</div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={set2Team1}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSet2Team1(val);
                            syncFromBuilder(set1Team1, set1Team2, val, set2Team2, hasSet3, set3Team1, set3Team2);
                          }}
                          placeholder="4"
                          className="w-full bg-slate-950 border border-slate-700 text-center font-bold text-emerald-400 text-base py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <span className="text-slate-600 font-bold mt-4">-</span>
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 truncate mb-1">{team2DisplayName}</div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={set2Team2}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSet2Team2(val);
                            syncFromBuilder(set1Team1, set1Team2, set2Team1, val, hasSet3, set3Team1, set3Team2);
                          }}
                          placeholder="6"
                          className="w-full bg-slate-950 border border-slate-700 text-center font-bold text-emerald-400 text-base py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Set 3 Toggle & Inputs */}
                <div>
                  {!hasSet3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHasSet3(true);
                        syncFromBuilder(set1Team1, set1Team2, set2Team1, set2Team2, true, set3Team1, set3Team2);
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-800 transition flex items-center gap-1.5 cursor-pointer w-full justify-center"
                    >
                      <span>+ Añadir 3er Set</span>
                    </button>
                  ) : (
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-bold text-slate-400">Set 3 (Definitivo)</div>
                        <button
                          type="button"
                          onClick={() => {
                            setHasSet3(false);
                            setSet3Team1('');
                            setSet3Team2('');
                            syncFromBuilder(set1Team1, set1Team2, set2Team1, set2Team2, false, '', '');
                          }}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Quitar 3er Set
                        </button>
                      </div>
                      <div className="flex items-center gap-2 max-w-sm mx-auto">
                        <div className="flex-1">
                          <div className="text-[10px] text-slate-400 truncate mb-1">{team1DisplayName}</div>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={set3Team1}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSet3Team1(val);
                              syncFromBuilder(set1Team1, set1Team2, set2Team1, set2Team2, true, val, set3Team2);
                            }}
                            placeholder="7"
                            className="w-full bg-slate-950 border border-slate-700 text-center font-bold text-emerald-400 text-base py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <span className="text-slate-600 font-bold mt-4">-</span>
                        <div className="flex-1">
                          <div className="text-[10px] text-slate-400 truncate mb-1">{team2DisplayName}</div>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={set3Team2}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSet3Team2(val);
                              syncFromBuilder(set1Team1, set1Team2, set2Team1, set2Team2, true, set3Team1, val);
                            }}
                            placeholder="5"
                            className="w-full bg-slate-950 border border-slate-700 text-center font-bold text-emerald-400 text-base py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Score Text Preview / Manual field */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Texto del Marcador Final en el Acta:</div>
              <input
                type="text"
                value={setsScoreText}
                onChange={(e) => setSetsScoreText(e.target.value)}
                placeholder="ej: 6-4, 4-6, 7-5"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 2. Winner Team Selector (V/D) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span>2. Pareja Ganadora del Partido (Asigna Victorias y Derrotas V/D)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option Team 1 */}
              <button
                type="button"
                onClick={() => setWinnerTeam(1)}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  winnerTeam === 1
                    ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {winnerTeam === 1 && (
                  <span className="absolute top-3 right-3 p-1 bg-emerald-500 text-slate-950 rounded-full">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <Trophy className={`w-4 h-4 ${winnerTeam === 1 ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${winnerTeam === 1 ? 'text-emerald-300' : 'text-slate-300'}`}>
                    Pareja 1 (Ganadores)
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{team1DisplayName}</div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                  {team1Players.map(p => (
                    <span key={p} className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-emerald-300 font-medium">
                      {p} (+1 Victoria)
                    </span>
                  ))}
                </div>
              </button>

              {/* Option Team 2 */}
              <button
                type="button"
                onClick={() => setWinnerTeam(2)}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  winnerTeam === 2
                    ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {winnerTeam === 2 && (
                  <span className="absolute top-3 right-3 p-1 bg-emerald-500 text-slate-950 rounded-full">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <Trophy className={`w-4 h-4 ${winnerTeam === 2 ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${winnerTeam === 2 ? 'text-emerald-300' : 'text-slate-300'}`}>
                    Pareja 2 (Ganadores)
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{team2DisplayName}</div>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                  {team2Players.map(p => (
                    <span key={p} className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-emerald-300 font-medium">
                      {p} (+1 Victoria)
                    </span>
                  ))}
                </div>
              </button>
            </div>

            {/* Option No winner defined */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setWinnerTeam(undefined)}
                className={`text-[11px] px-3 py-1 rounded-lg border transition cursor-pointer ${
                  winnerTeam === undefined
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                Sin ganador definitivo / Empate
              </button>
            </div>
          </div>

          {/* 3. Completion Status & MVP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Completion Status */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-2">
                Estado del Partido
              </label>
              <button
                type="button"
                onClick={() => setIsCompleted(!isCompleted)}
                className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">
                    {isCompleted ? '✅ Partido Finalizado' : '⏳ Partido En Curso / Parcial'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isCompleted ? 'Cierra el acta y computa en el balance V/D' : 'Mantiene la etiqueta de en curso'}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isCompleted ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-amber-500'
                }`}>
                  {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>

            {/* MVP selection */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>MVP del Partido (Opcional)</span>
              </label>
              <select
                value={mvp}
                onChange={(e) => setMvp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Sin MVP asignado</option>
                {allMatchPlayers.map(pName => (
                  <option key={pName} value={pName}>
                    {pName} {winnerTeam === 1 && team1Players.includes(pName) ? '🏆 (Ganador)' : ''}{winnerTeam === 2 && team2Players.includes(pName) ? '🏆 (Ganador)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 p-5 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar Resultado y Actualizar V/D</span>
          </button>
        </div>

      </div>
    </div>
  );
};
