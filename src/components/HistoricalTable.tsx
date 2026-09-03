import React, { useState, useMemo } from 'react';
import { Trophy, Zap, AlertTriangle, ShieldAlert, Activity, ArrowUpDown, ArrowUp, ArrowDown, Search, Award, Flame, User } from 'lucide-react';
import { PlayerHistorySummary } from '../types';
import { getPlayerColor } from '../utils/statsCalculator';

interface HistoricalTableProps {
  playerHistories: PlayerHistorySummary[];
  onSelectPlayer?: (playerName: string) => void;
}

type SortField = 'name' | 'matchesPlayed' | 'winRate' | 'totalTouches' | 'avgTouches' | 'totalForcedErrors' | 'totalUnforcedErrors' | 'unforcedErrorPerTouchPct' | 'totalWinners' | 'winnerToUnforcedRatio' | 'netDifferential';

export const HistoricalTable: React.FC<HistoricalTableProps> = ({ playerHistories, onSelectPlayer }) => {
  const [sortField, setSortField] = useState<SortField>('winRate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default to descending for numbers
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = playerHistories.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [playerHistories, sortField, sortAsc, searchQuery]);

  // Find leaders
  const leaderWinners = useMemo(() => [...playerHistories].sort((a, b) => b.totalWinners - a.totalWinners)[0]?.name, [playerHistories]);
  const leaderTouches = useMemo(() => [...playerHistories].sort((a, b) => b.totalTouches - a.totalTouches)[0]?.name, [playerHistories]);
  const leaderFewestUnforced = useMemo(() => [...playerHistories].sort((a, b) => a.avgUnforcedErrors - b.avgUnforcedErrors)[0]?.name, [playerHistories]);
  const leaderWinRate = useMemo(() => [...playerHistories].sort((a, b) => b.winRate - a.winRate)[0]?.name, [playerHistories]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60 ml-1 inline" />;
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-emerald-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-400 ml-1 inline" />
    );
  };

  return (
    <div id="historical-performance-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      {/* Header & Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Tabla Comparativa de Rendimiento Histórico
              </h2>
              <p className="text-xs text-slate-400">
                Acumulado histórico entre amigos: Toques, Errores forzados, Errores no forzados y Winners.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="search-player-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar participante..."
            className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Leader Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/20 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mayor % Victorias</div>
            <div className="text-sm font-black text-amber-300 truncate">{leaderWinRate || '-'}</div>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/20 flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rey de Winners</div>
            <div className="text-sm font-black text-cyan-300 truncate">{leaderWinners || '-'}</div>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mayor Volumen Toques</div>
            <div className="text-sm font-black text-emerald-300 truncate">{leaderTouches || '-'}</div>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-purple-500/20 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Muro (Menos ENF)</div>
            <div className="text-sm font-black text-purple-300 truncate">{leaderFewestUnforced || '-'}</div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800 select-none">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition"
              >
                Participante {renderSortIcon('name')}
              </th>
              <th
                onClick={() => handleSort('matchesPlayed')}
                className="py-3.5 px-3 text-center cursor-pointer hover:text-white transition"
              >
                Partidos {renderSortIcon('matchesPlayed')}
              </th>
              <th
                onClick={() => handleSort('winRate')}
                className="py-3.5 px-3 text-center cursor-pointer hover:text-white transition"
              >
                % Victorias {renderSortIcon('winRate')}
              </th>
              <th
                onClick={() => handleSort('totalTouches')}
                className="py-3.5 px-3 text-center cursor-pointer hover:text-white transition text-emerald-400"
              >
                Toques Tot. (Media) {renderSortIcon('totalTouches')}
              </th>
              <th
                onClick={() => handleSort('totalForcedErrors')}
                className="py-3.5 px-3 text-center cursor-pointer hover:text-white transition text-amber-400"
              >
                Err. Forzados {renderSortIcon('totalForcedErrors')}
              </th>
              <th
                onClick={() => handleSort('totalUnforcedErrors')}
                className="py-3.5 px-3 text-center cursor-pointer hover:text-white transition text-rose-400"
              >
                Err. No Forzados {renderSortIcon('totalUnforcedErrors')}
              </th>
              <th
                onClick={() => handleSort('unforcedErrorPerTouchPct')}
                className="py-3.5 px-3 text-center cursor-pointer hover:text-white transition text-rose-300 font-black bg-rose-950/20"
                title="Porcentaje de errores no forzados respecto al volumen total de toques"
              >
                % ENF / Toque {renderSortIcon('unforcedErrorPerTouchPct')}
              </th>
              <th
                onClick={() => handleSort('totalWinners')}
                className="py-3.5 px-3 text-center cursor-pointer hover:text-white transition text-cyan-400"
              >
                Winners {renderSortIcon('totalWinners')}
              </th>
              <th
                onClick={() => handleSort('netDifferential')}
                className="py-3.5 px-4 text-center cursor-pointer hover:text-white transition"
              >
                Balance (W - ENF) {renderSortIcon('netDifferential')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                  <Trophy className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <div className="font-semibold text-slate-400">Aún no hay estadísticas acumuladas</div>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Anota o graba tu primer partido desde el Marcador en Vivo o la pestaña de Audio/Texto para empezar a registrar datos.
                  </p>
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((player, index) => {
                const pColor = getPlayerColor(player.name);
              const isWinRateLeader = player.name === leaderWinRate;
              const isWinnersLeader = player.name === leaderWinners;
              const isTouchesLeader = player.name === leaderTouches;

              return (
                <tr
                  key={`hist-row-${index}-${player.name}`}
                  id={`table-row-player-${player.name}`}
                  onClick={() => onSelectPlayer && onSelectPlayer(player.name)}
                  className="hover:bg-slate-900/60 transition cursor-pointer group"
                >
                  {/* Player Name */}
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shadow"
                      style={{ backgroundColor: pColor }}
                    >
                      {player.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1.5">
                        {player.name}
                        {isWinnersLeader && <Zap className="w-3 h-3 text-cyan-400" title="Líder en Winners" />}
                        {isWinRateLeader && <Trophy className="w-3 h-3 text-amber-400" title="Mayor % Victorias" />}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {player.matchesWon} victorias / {player.matchesPlayed - player.matchesWon} derrotas
                      </div>
                    </div>
                  </td>

                  {/* Matches Played */}
                  <td className="py-3 px-3 text-center font-mono text-slate-300">
                    {player.matchesPlayed}
                  </td>

                  {/* Win Rate */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-bold text-xs text-slate-200">{player.winRate}%</span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Toques Totales (Media) */}
                  <td className="py-3 px-3 text-center font-mono">
                    <div className="font-bold text-emerald-400">{player.totalTouches}</div>
                    <div className="text-[10px] text-slate-500">({player.avgTouches}/partido)</div>
                  </td>

                  {/* Errores Forzados */}
                  <td className="py-3 px-3 text-center font-mono">
                    <div className="font-bold text-amber-400">{player.totalForcedErrors}</div>
                    <div className="text-[10px] text-slate-500">({player.avgForcedErrors}/p)</div>
                  </td>

                  {/* Errores No Forzados */}
                  <td className="py-3 px-3 text-center font-mono">
                    <div className="font-bold text-rose-400">{player.totalUnforcedErrors}</div>
                    <div className="text-[10px] text-slate-500">({player.avgUnforcedErrors}/p)</div>
                  </td>

                  {/* % ENF / Toque */}
                  <td className="py-3 px-3 text-center font-mono bg-rose-950/10">
                    <div className="flex flex-col items-center">
                      <span className="font-black text-rose-400 text-xs">
                        {player.unforcedErrorPerTouchPct}%
                      </span>
                      <span className="text-[9px] text-slate-400">
                        1 fallo c/{player.touchesPerUnforcedError} t.
                      </span>
                    </div>
                  </td>

                  {/* Winners */}
                  <td className="py-3 px-3 text-center font-mono">
                    <div className="font-bold text-cyan-400">{player.totalWinners}</div>
                    <div className="text-[10px] text-slate-500">({player.avgWinners}/p)</div>
                  </td>

                  {/* Net Differential */}
                  <td className="py-3 px-4 text-center font-mono">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs ${
                        player.netDifferential >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {player.netDifferential >= 0 ? `+${player.netDifferential}` : player.netDifferential}
                    </span>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
