import React, { useState } from 'react';
import { Trophy, Zap, AlertTriangle, ShieldAlert, Activity, Sparkles, Check, BookmarkPlus, Plus, Minus, Flame, Target, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlayerStats, PadelMatch } from '../types';
import { getPlayerColor } from '../utils/statsCalculator';

interface MatchSummaryCardProps {
  analysisData: {
    transcription: string;
    detectedPlayers: string[];
    stats: Record<string, PlayerStats>;
    summary: string;
    highlights: string[];
    mvp: string;
    scoreEstimate?: string;
    tacticalAdvice?: string;
    audioName?: string;
    correctionsApplied?: string[];
    youtubeUrl?: string;
  };
  onSaveToHistory: (match: PadelMatch) => void;
  onDiscard?: () => void;
}

export const MatchSummaryCard: React.FC<MatchSummaryCardProps> = ({
  analysisData,
  onSaveToHistory,
  onDiscard
}) => {
  const [editableStats, setEditableStats] = useState<Record<string, PlayerStats>>(analysisData.stats || {});
  const [matchTitle, setMatchTitle] = useState<string>(`Partido de Pádel - ${new Date().toLocaleDateString('es-ES')}`);
  const [score, setScore] = useState<string>(analysisData.scoreEstimate || '6-4, 6-3');
  const [court, setCourt] = useState<string>('Pista Principal');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const players = Object.keys(editableStats);

  const handleStatChange = (playerName: string, statKey: keyof PlayerStats, delta: number) => {
    setEditableStats((prev) => {
      const current = prev[playerName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
      const currentVal = (current[statKey] as number) || 0;
      const nextVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [playerName]: {
          ...current,
          [statKey]: nextVal
        }
      };
    });
  };

  const handleSave = () => {
    // Determine teams based on players list
    const p1 = players[0] || 'Jugador 1';
    const p2 = players[1] || 'Jugador 2';
    const p3 = players[2] || 'Jugador 3';
    const p4 = players[3] || 'Jugador 4';

    const newMatch: PadelMatch = {
      id: `match-${Date.now()}`,
      title: matchTitle,
      date: new Date().toISOString().split('T')[0],
      court,
      team1: {
        name: `${p1} & ${p2}`,
        player1: p1,
        player2: p2,
      },
      team2: {
        name: `${p3} & ${p4}`,
        player1: p3,
        player2: p4,
      },
      setsScore: score,
      winnerTeam: 1,
      stats: editableStats,
      summary: analysisData.summary,
      highlights: analysisData.highlights,
      mvp: analysisData.mvp || p1,
      tacticalNotes: analysisData.tacticalAdvice,
      youtubeUrl: analysisData.youtubeUrl,
      audioNotes: [
        {
          id: `audio-${Date.now()}`,
          audioName: analysisData.audioName || 'Nota de voz del partido',
          timestamp: new Date().toISOString(),
          transcription: analysisData.transcription,
          detectedStats: editableStats,
          summarySnippet: analysisData.summary
        }
      ]
    };

    onSaveToHistory(newMatch);
    setIsSaved(true);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div id="match-summary-card" className="bg-slate-900 border-2 border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-slate-100 relative overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Resumen Automático Generado con IA
            </span>
            {analysisData.mvp && (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30">
                <Trophy className="w-3.5 h-3.5" />
                MVP: {analysisData.mvp}
              </span>
            )}
          </div>
          <input
            type="text"
            value={matchTitle}
            onChange={(e) => setMatchTitle(e.target.value)}
            className="text-2xl font-black text-white bg-transparent border-b border-dashed border-slate-700 focus:border-emerald-400 focus:outline-none w-full max-w-xl py-0.5"
          />
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              📅 {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              🎾 Tanteo:
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="bg-slate-800 text-emerald-300 font-bold px-2 py-0.5 rounded border border-slate-700 w-24 text-center focus:outline-none"
              />
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Descartar
            </button>
          )}
          <button
            id="btn-save-match-to-history"
            type="button"
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer ${
              isSaved
                ? 'bg-emerald-600/50 text-emerald-200 border border-emerald-500/50 cursor-default'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                ¡Guardado en el Historial!
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                Guardar en Historial del Grupo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Self-Corrections Detected Alert */}
      {analysisData.correctionsApplied && analysisData.correctionsApplied.length > 0 && (
        <div className="mt-4 p-3.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex items-start gap-2.5 text-xs text-cyan-200">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-cyan-300">
              Autocorrecciones / Rectificaciones aplicadas automáticamente:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-cyan-100/90">
              {analysisData.correctionsApplied.map((corr, idx) => (
                <li key={idx}>{corr}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 4 CORE STATS GRID PER PLAYER */}
      <div className="my-6">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
          <span>Estadísticas del Partido por Jugador (Auditoría en Vivo):</span>
          <span className="text-[11px] text-slate-500 font-normal">
            Puedes ajustar cualquier valor con los botones (+ / -)
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {players.map((playerName, idx) => {
            const stats = editableStats[playerName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
            const pColor = getPlayerColor(playerName);
            const isMVP = analysisData.mvp?.toLowerCase() === playerName.toLowerCase();
            const net = stats.winners - stats.unforcedErrors;

            return (
              <div
                key={`summary-player-card-${idx}-${playerName}`}
                id={`player-stat-card-${playerName}`}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: pColor }}
                    />
                    <h4 className="font-bold text-white text-base truncate">{playerName}</h4>
                  </div>
                  {isMVP && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                      MVP 🌟
                    </span>
                  )}
                </div>

                {/* 1. Toques por persona */}
                <div className="bg-slate-900/90 p-2 rounded-lg mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Toques:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'touches', -1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-emerald-400 w-8 text-center">
                      {stats.touches}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'touches', 1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Errores forzados */}
                <div className="bg-slate-900/90 p-2 rounded-lg mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Err. Forzados:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'forcedErrors', -1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-amber-400 w-8 text-center">
                      {stats.forcedErrors}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'forcedErrors', 1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Errores no forzados */}
                <div className="bg-slate-900/90 p-2 rounded-lg mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Err. No Forzados:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'unforcedErrors', -1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-rose-400 w-8 text-center">
                      {stats.unforcedErrors}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'unforcedErrors', 1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Winners */}
                <div className="bg-slate-900/90 p-2 rounded-lg mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Winners:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'winners', -1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-sm text-cyan-400 w-8 text-center">
                      {stats.winners}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStatChange(playerName, 'winners', 1)}
                      className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Net Differential */}
                <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Balance W / ENF:</span>
                  <span className={`font-mono font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {net >= 0 ? `+${net}` : net}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tactical Summary & Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Narrative Summary */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            Resumen Táctico del Partido
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">{analysisData.summary}</p>

          {analysisData.tacticalAdvice && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-teal-300/90 bg-teal-950/30 p-2.5 rounded-lg border border-teal-800/40">
              <strong className="text-teal-200">💡 Consejo de la IA: </strong>
              {analysisData.tacticalAdvice}
            </div>
          )}
        </div>

        {/* Highlights & Audio Transcript */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Jugadas Destacadas (Highlights)
            </h4>
            <ul className="space-y-1.5 mb-3">
              {analysisData.highlights.map((item, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {analysisData.transcription && (
            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-1 text-slate-500 font-semibold mb-1">
                <MessageSquare className="w-3 h-3" /> Transcripción del audio:
              </div>
              <p className="italic bg-slate-900/60 p-2 rounded border border-slate-800/50 max-h-20 overflow-y-auto">
                "{analysisData.transcription}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
