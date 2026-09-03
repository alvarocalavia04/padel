import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';
import { TrendingUp, Activity, Zap, AlertTriangle, ShieldAlert, User, Calendar, Award } from 'lucide-react';
import { PadelMatch, PlayerHistorySummary } from '../types';
import { getPlayerColor } from '../utils/statsCalculator';

interface EvolutionChartsProps {
  matches: PadelMatch[];
  playerHistories: PlayerHistorySummary[];
  selectedPlayerName?: string;
  onSelectPlayer?: (name: string) => void;
}

export const EvolutionCharts: React.FC<EvolutionChartsProps> = ({
  matches,
  playerHistories,
  selectedPlayerName,
  onSelectPlayer
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'individual' | 'winners_errors' | 'touches_volume' | 'radar_skills'>('individual');
  const [currentPlayer, setCurrentPlayer] = useState<string>(selectedPlayerName || playerHistories[0]?.name || '');

  // Sync if selectedPlayerName prop changes or when playerHistories updates
  React.useEffect(() => {
    if (selectedPlayerName) {
      setCurrentPlayer(selectedPlayerName);
    } else if (!currentPlayer && playerHistories.length > 0) {
      setCurrentPlayer(playerHistories[0].name);
    }
  }, [selectedPlayerName, playerHistories, currentPlayer]);

  // Sort matches chronologically for charts
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [matches]);

  // Data for Individual Player Evolution
  const individualTimelineData = useMemo(() => {
    const playerObj = playerHistories.find((p) => p.name === currentPlayer);
    if (!playerObj) return [];

    return playerObj.timeline.map((item, idx) => {
      const shortDate = item.matchDate ? item.matchDate.split('-').slice(1).join('/') : `P${idx + 1}`;
      return {
        matchIndex: idx + 1,
        matchLabel: `P${idx + 1} (${shortDate})`,
        matchTitle: item.matchTitle,
        fullDate: item.matchDate,
        touches: item.touches,
        forcedErrors: item.forcedErrors,
        unforcedErrors: item.unforcedErrors,
        winners: item.winners,
        netDifferential: item.winners - item.unforcedErrors,
        won: item.won ? 1 : 0,
        resultLabel: item.won ? 'Victoria' : 'Derrota',
        unforcedErrorPerTouchPct: item.unforcedErrorPerTouchPct || 0,
        touchesPerUnforcedError: item.touchesPerUnforcedError || item.touches,
        progressionDeltaPct: item.progressionDeltaPct
      };
    });
  }, [playerHistories, currentPlayer]);

  // Data for Group Winners vs Unforced Errors over time
  const groupEvolutionData = useMemo(() => {
    return sortedMatches.map((match, idx) => {
      const entry: Record<string, any> = {
        date: match.date.split('-').slice(1).join('/'),
        fullDate: match.date,
        matchTitle: match.title,
        matchIndex: idx + 1
      };

      Object.keys(match.stats).forEach((playerName) => {
        const pStat = match.stats[playerName];
        entry[`${playerName}_winners`] = pStat.winners || 0;
        entry[`${playerName}_unforced`] = pStat.unforcedErrors || 0;
        entry[`${playerName}_touches`] = pStat.touches || 0;
        entry[`${playerName}_forced`] = pStat.forcedErrors || 0;
      });

      return entry;
    });
  }, [sortedMatches]);

  // Data for Radar Skills Comparison
  const radarData = useMemo(() => {
    const categories = [
      { key: 'winners', label: '⚡ Pegada (Winners)' },
      { key: 'touches', label: '🎾 Volumen (Toques)' },
      { key: 'control', label: '🛡️ Seguridad (Pocos ENF)' },
      { key: 'winRate', label: '🏆 % Victorias' },
      { key: 'defense', label: '🧱 Resistencia Defensiva' }
    ];

    // Max values for normalization
    const maxWinners = Math.max(...playerHistories.map((p) => p.avgWinners), 1);
    const maxTouches = Math.max(...playerHistories.map((p) => p.avgTouches), 1);
    const minUnforced = Math.min(...playerHistories.map((p) => p.avgUnforcedErrors), 0.1);
    const maxUnforced = Math.max(...playerHistories.map((p) => p.avgUnforcedErrors), 1);

    return categories.map((cat) => {
      const row: Record<string, any> = { metric: cat.label };

      playerHistories.forEach((p) => {
        if (cat.key === 'winners') {
          row[p.name] = Math.round((p.avgWinners / maxWinners) * 100);
        } else if (cat.key === 'touches') {
          row[p.name] = Math.round((p.avgTouches / maxTouches) * 100);
        } else if (cat.key === 'control') {
          // Inverted: lower unforced errors -> higher score
          const controlScore = Math.max(10, Math.round(100 - (p.avgUnforcedErrors / (maxUnforced + 2)) * 100));
          row[p.name] = controlScore;
        } else if (cat.key === 'winRate') {
          row[p.name] = p.winRate;
        } else if (cat.key === 'defense') {
          row[p.name] = Math.max(20, Math.round(100 - (p.avgForcedErrors * 8)));
        }
      });

      return row;
    });
  }, [playerHistories]);

  // Selected player history summary
  const selectedPlayerData = playerHistories.find((p) => p.name === currentPlayer);

  return (
    <div id="evolution-charts-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Gráficos de Evolución y Tendencias
              </h2>
              <p className="text-xs text-slate-400">
                Visualiza cómo ha evolucionado el juego, los winners, toques y errores a lo largo del tiempo.
              </p>
            </div>
          </div>
        </div>

        {/* Chart View Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
          <button
            type="button"
            id="btn-chart-tab-individual"
            onClick={() => setActiveChartTab('individual')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeChartTab === 'individual' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Evolución Individual
          </button>
          <button
            type="button"
            id="btn-chart-tab-winners"
            onClick={() => setActiveChartTab('winners_errors')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeChartTab === 'winners_errors' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Winners vs Errores
          </button>
          <button
            type="button"
            id="btn-chart-tab-touches"
            onClick={() => setActiveChartTab('touches_volume')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeChartTab === 'touches_volume' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Volumen de Toques
          </button>
          <button
            type="button"
            id="btn-chart-tab-radar"
            onClick={() => setActiveChartTab('radar_skills')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeChartTab === 'radar_skills' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Radar Multijugador
          </button>
        </div>
      </div>

      {/* Empty State when no matches */}
      {playerHistories.length === 0 && (
        <div className="mt-6 p-12 text-center bg-slate-950 rounded-xl border border-slate-800">
          <TrendingUp className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300 mb-1">Sin datos de evolución temporal</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cuando guardes tus partidos, aquí se generarán automáticamente las curvas de winners, fallos forzados y no forzados, evolución de toques y el radar comparativo de habilidades.
          </p>
        </div>
      )}

      {/* 1. INDIVIDUAL PLAYER EVOLUTION TAB */}
      {playerHistories.length > 0 && activeChartTab === 'individual' && (
        <div className="mt-5">
          {/* Player Chips Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
            <span className="text-xs text-slate-400 font-medium shrink-0">Seleccionar jugador:</span>
            {playerHistories.map((p, idx) => {
              const pColor = getPlayerColor(p.name);
              const isSelected = p.name === currentPlayer;
              return (
                <button
                  key={`evo-player-chip-${idx}-${p.name}`}
                  id={`chip-player-${p.name}`}
                  type="button"
                  onClick={() => {
                    setCurrentPlayer(p.name);
                    if (onSelectPlayer) onSelectPlayer(p.name);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white shadow ring-2'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  style={{
                    borderColor: isSelected ? pColor : undefined,
                    boxShadow: isSelected ? `0 0 10px ${pColor}40` : undefined
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: pColor }}
                  />
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* Quick Metrics Bar for Selected Player */}
          {selectedPlayerData && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Toques / Partido</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {selectedPlayerData.avgTouches}
                    <span className="text-[10px] text-slate-500 font-normal ml-1">({selectedPlayerData.totalTouches} tot.)</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Winners / Partido</div>
                  <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                    {selectedPlayerData.avgWinners}
                    <span className="text-[10px] text-slate-500 font-normal ml-1">({selectedPlayerData.totalWinners} tot.)</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Err. No Forzados / P</div>
                  <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                    {selectedPlayerData.avgUnforcedErrors}
                    <span className="text-[10px] text-slate-500 font-normal ml-1">({selectedPlayerData.totalUnforcedErrors} tot.)</span>
                  </div>
                </div>

                {/* KEY REQUESTED METRIC: % Error No Forzado por Toque */}
                <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 bg-gradient-to-br from-slate-950 to-rose-950/20">
                  <div className="text-[10px] text-rose-300 font-bold uppercase flex items-center justify-between">
                    <span>% ENF / Toque</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                      selectedPlayerData.unforcedErrorTrend === 'improving'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : selectedPlayerData.unforcedErrorTrend === 'worsening'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {selectedPlayerData.unforcedErrorTrend === 'improving' ? '📉 Mejora' : selectedPlayerData.unforcedErrorTrend === 'worsening' ? '📈 Al alza' : '⚖️ Estable'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                    {selectedPlayerData.unforcedErrorPerTouchPct}%
                  </div>
                  <div className="text-[10px] text-slate-400">1 fallo c/{selectedPlayerData.touchesPerUnforcedError} toques</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-300 font-semibold uppercase">Mejor Partido (% ENF)</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {selectedPlayerData.bestUnforcedErrorPerTouchPct}%
                  </div>
                  <div className="text-[10px] text-slate-400">Mínimo de fallos</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Balance Neto (W - ENF)</div>
                  <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                    {selectedPlayerData.netDifferential >= 0 ? `+${selectedPlayerData.netDifferential}` : selectedPlayerData.netDifferential}
                    <span className="text-[10px] text-slate-500 font-normal ml-1">({selectedPlayerData.winRate}% vict.)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Individual Charts: Multi-Metric and Dedicated % ENF / Toque curve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Chart 1: Winners vs Errores vs Toques */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>1. Puntos & Volumen de {currentPlayer}:</span>
                <span className="text-[10px] text-slate-500 font-normal">Winners vs Errores</span>
              </h4>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={individualTimelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="matchLabel" stroke="#64748B" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#64748B" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                    {/* Toques as subtle Area on right axis */}
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="touches"
                      name="🎾 Toques"
                      fill="#10B981"
                      stroke="#10B981"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />

                    {/* Winners as Cyan line */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="winners"
                      name="⚡ Winners"
                      stroke="#06B6D4"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#06B6D4' }}
                      activeDot={{ r: 6 }}
                    />

                    {/* Errores No Forzados as Rose line */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="unforcedErrors"
                      name="❌ Fallos No Forzados"
                      stroke="#F43F5E"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#F43F5E' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Curva de Progresión % Error No Forzado por Toque */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>2. Curva de % Error No Forzado por Toque:</span>
                </h4>
                <span className="text-[10px] text-emerald-400 font-mono">
                  (Objetivo: tendencia a la baja 📉)
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={individualTimelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="matchLabel" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} unit="%" domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      labelStyle={{ color: '#F8FAFC', fontWeight: 'bold' }}
                      formatter={(val: any) => [`${val}%`, '% Error No Forzado por Toque']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                    <Line
                      type="monotone"
                      dataKey="unforcedErrorPerTouchPct"
                      name="% ENF / Toque"
                      stroke="#F43F5E"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#F43F5E' }}
                      activeDot={{ r: 7, stroke: '#FECDD3', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* DEDICATED TABLE: SEGUIMIENTO DEL JUGADOR - PROGRESIÓN DE % ERROR NO FORZADO POR TOQUE */}
          <div className="bg-slate-950 p-5 rounded-2xl border-2 border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Tabla de Seguimiento del Jugador: Progresión de % Error No Forzado por Toque
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Evolución partido a partido de la tasa de fallo respecto al volumen de toques jugados por <strong className="text-slate-200">{currentPlayer}</strong>.
                  </p>
                </div>
              </div>

              {selectedPlayerData && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    Media Global: <strong className="text-rose-400 font-mono">{selectedPlayerData.unforcedErrorPerTouchPct}%</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    Mejor Partido: <strong className="text-emerald-400 font-mono">{selectedPlayerData.bestUnforcedErrorPerTouchPct}%</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Match by Match Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5">Partido / Fecha</th>
                    <th className="py-3 px-2.5 text-center">Resultado</th>
                    <th className="py-3 px-2.5 text-center text-emerald-400">Toques</th>
                    <th className="py-3 px-2.5 text-center text-rose-400">Err. No Forzados</th>
                    <th className="py-3 px-3 text-center text-rose-300 font-black">
                      % ENF / Toque
                    </th>
                    <th className="py-3 px-3 text-center">Frecuencia</th>
                    <th className="py-3 px-3 text-center">
                      Progresión vs Anterior
                    </th>
                    <th className="py-3 px-2.5 text-center text-cyan-400">Winners</th>
                    <th className="py-3 px-3 text-center">Balance (W - ENF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {individualTimelineData.map((item, idx) => {
                    const isBest = item.unforcedErrorPerTouchPct === selectedPlayerData?.bestUnforcedErrorPerTouchPct;
                    const delta = item.progressionDeltaPct;

                    // Consistency tier
                    let tierBadge = { text: 'Excelente', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
                    if (item.unforcedErrorPerTouchPct > 8) {
                      tierBadge = { text: 'Elevado', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
                    } else if (item.unforcedErrorPerTouchPct >= 5) {
                      tierBadge = { text: 'Moderado', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
                    }

                    return (
                      <tr
                        key={`prog-row-${idx}-${item.matchTitle}`}
                        className={`hover:bg-slate-900/90 transition ${isBest ? 'bg-emerald-950/20' : ''}`}
                      >
                        {/* Match & Date */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-400 text-[11px]">
                              P{idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                {item.matchTitle}
                                {isBest && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full border border-emerald-500/30 font-semibold">
                                    ⭐ Más seguro
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {item.fullDate}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Result */}
                        <td className="py-2.5 px-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.won === 1
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {item.won === 1 ? 'Victoria' : 'Derrota'}
                          </span>
                        </td>

                        {/* Touches */}
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-emerald-400">
                          {item.touches}
                        </td>

                        {/* Unforced Errors */}
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-rose-400">
                          {item.unforcedErrors}
                        </td>

                        {/* % ENF / Toque (CORE COLUMN) */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-white">
                                {item.unforcedErrorPerTouchPct}%
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${tierBadge.bg}`}>
                                {tierBadge.text}
                              </span>
                            </div>
                            {/* Mini visual progress bar */}
                            <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.unforcedErrorPerTouchPct <= 4
                                    ? 'bg-emerald-400'
                                    : item.unforcedErrorPerTouchPct <= 8
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(item.unforcedErrorPerTouchPct * 7, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Frequency */}
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300">
                          1 fallo c/ <strong className="text-white">{item.touchesPerUnforcedError}</strong> toques
                        </td>

                        {/* Progression vs Previous Match */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          {delta === undefined ? (
                            <span className="text-[10px] text-slate-500 italic">Primer partido</span>
                          ) : delta < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span>📉</span>
                              <span>{delta}%</span>
                              <span className="text-[9px] font-normal uppercase">(Mejora)</span>
                            </span>
                          ) : delta > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <span>📈</span>
                              <span>+{delta}%</span>
                              <span className="text-[9px] font-normal uppercase">(Empeora)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                              <span>=</span>
                              <span>0.0%</span>
                              <span className="text-[9px] font-normal uppercase">(Estable)</span>
                            </span>
                          )}
                        </td>

                        {/* Winners */}
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-cyan-400">
                          {item.winners}
                        </td>

                        {/* Balance Neto */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                            item.netDifferential >= 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {item.netDifferential >= 0 ? `+${item.netDifferential}` : item.netDifferential}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Diagnostic Footer */}
            {individualTimelineData.length >= 2 && (
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <div>
                    <span className="font-bold text-white">Diagnóstico de Progresión: </span>
                    <span className="text-slate-300">
                      {currentPlayer} pasó de un <strong className="text-rose-400 font-mono">{individualTimelineData[0].unforcedErrorPerTouchPct}%</strong> en su primer partido a un <strong className="text-emerald-400 font-mono">{individualTimelineData[individualTimelineData.length - 1].unforcedErrorPerTouchPct}%</strong> en el último registrado.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const first = individualTimelineData[0].unforcedErrorPerTouchPct;
                    const last = individualTimelineData[individualTimelineData.length - 1].unforcedErrorPerTouchPct;
                    const totalDiff = +(last - first).toFixed(1);

                    return totalDiff < 0 ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold font-mono">
                        📉 Progresión Neta: {totalDiff}% (Más Sólido)
                      </span>
                    ) : totalDiff > 0 ? (
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-bold font-mono">
                        📈 Progresión Neta: +{totalDiff}% (Más Errores)
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-xl font-bold font-mono">
                        = Progresión Neutra: 0.0%
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. GROUP WINNERS VS UNFORCED ERRORS */}
      {playerHistories.length > 0 && activeChartTab === 'winners_errors' && (
        <div className="mt-5">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Comparativa Temporal de Winners por Jugador:
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Observa cómo ha evolucionado la capacidad anotadora de cada amigo en cada fecha.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupEvolutionData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                  {playerHistories.slice(0, 5).map((p, idx) => {
                    const color = getPlayerColor(p.name);
                    return (
                      <Line
                        key={`evo-line-win-${idx}-${p.name}`}
                        type="monotone"
                        dataKey={`${p.name}_winners`}
                        name={`⚡ Winners ${p.name}`}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Errores no forzados comparison chart */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mt-4">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
              Evolución de Errores No Forzados (Buscar tendencia a la baja):
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupEvolutionData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                  {playerHistories.slice(0, 5).map((p, idx) => {
                    const color = getPlayerColor(p.name);
                    return (
                      <Line
                        key={`evo-line-unf-${idx}-${p.name}`}
                        type="monotone"
                        dataKey={`${p.name}_unforced`}
                        name={`❌ Fallos ${p.name}`}
                        stroke={color}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 3. TOUCHES VOLUME TAB */}
      {playerHistories.length > 0 && activeChartTab === 'touches_volume' && (
        <div className="mt-5">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Volumen Total de Toques por Partido:
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Mide el protagonismo y la participación de cada jugador en los intercambios de bola.
            </p>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupEvolutionData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                  {playerHistories.slice(0, 4).map((p, idx) => {
                    const color = getPlayerColor(p.name);
                    return (
                      <Bar
                        key={`evo-bar-touches-${idx}-${p.name}`}
                        dataKey={`${p.name}_touches`}
                        name={`🎾 Toques ${p.name}`}
                        fill={color}
                        radius={[4, 4, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 4. RADAR SKILLS COMPARISON */}
      {playerHistories.length > 0 && activeChartTab === 'radar_skills' && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 self-start">
              Radar de Perfil de Juego (Normalizado 0-100):
            </h4>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" stroke="#94A3B8" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />

                  {playerHistories.slice(0, 4).map((p, idx) => {
                    const color = getPlayerColor(p.name);
                    return (
                      <Radar
                        key={`evo-radar-poly-${idx}-${p.name}`}
                        name={p.name}
                        dataKey={p.name}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.2}
                      />
                    );
                  })}
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Archetypes Analysis */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                Interpretación Táctica de los Gráficos:
              </h4>
              <div className="space-y-3">
                {playerHistories.slice(0, 4).map((p, idx) => {
                  const pColor = getPlayerColor(p.name);
                  let archetype = 'Jugador Equilibrado';
                  let desc = 'Mantiene un balance estable de toques y definición.';

                  if (p.avgWinners >= 12) {
                    archetype = '💣 Cañonero Ofensivo';
                    desc = `Promedia ${p.avgWinners} winners por partido. Gran pegada aérea.`;
                  } else if (p.avgUnforcedErrors <= 5 && p.avgTouches >= 80) {
                    archetype = '🛡️ Muro de Contención';
                    desc = `Muy sólido desde el fondo, solo ${p.avgUnforcedErrors} fallos por encuentro.`;
                  } else if (p.avgTouches >= 90) {
                    archetype = '⚡ Motor de Juego';
                    desc = `Gran volumen con ${p.avgTouches} toques de media, abarcando mucha pista.`;
                  }

                  return (
                    <div key={`evo-arch-card-${idx}-${p.name}`} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: pColor }} />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {p.name}
                          <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                            {archetype}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic mt-3 pt-2 border-t border-slate-800">
              *Los datos se actualizan automáticamente al añadir nuevos audios de partidos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
