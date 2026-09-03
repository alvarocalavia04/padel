import React, { useState } from 'react';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Eye, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Pencil, 
  Check, 
  X, 
  FileDown,
  Play,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { PadelMatch } from '../types';
import { getPlayerColor } from '../utils/statsCalculator';
import { EditMatchResultModal } from './EditMatchResultModal';
import { ImportSingleMatchModal } from './ImportSingleMatchModal';
import { downloadSingleMatchJSON } from '../utils/matchExportImport';

interface MatchHistoryListProps {
  matches: PadelMatch[];
  isAdmin?: boolean;
  onSelectMatch: (match: PadelMatch) => void;
  onResumeMatch?: (match: PadelMatch) => void;
  onUpdateMatch?: (updatedMatch: PadelMatch) => void;
  onDeleteMatch: (matchId: string) => void;
  onResetToDefault: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onImportSingleMatch?: (match: PadelMatch, overwrite: boolean) => void;
}

export const MatchHistoryList: React.FC<MatchHistoryListProps> = ({
  matches,
  isAdmin = false,
  onSelectMatch,
  onResumeMatch,
  onUpdateMatch,
  onDeleteMatch,
  onResetToDefault,
  onExportData,
  onImportData,
  onImportSingleMatch
}) => {
  const [filterPlayer, setFilterPlayer] = useState<string>('all');
  const [editingDateMatchId, setEditingDateMatchId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState<string>('');
  const [editingResultMatch, setEditingResultMatch] = useState<PadelMatch | null>(null);
  const [isImportSingleModalOpen, setIsImportSingleModalOpen] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const getMatchActivePlayers = (m: PadelMatch): string[] => {
    const declared = [m.team1?.player1, m.team1?.player2, m.team2?.player1, m.team2?.player2].filter(Boolean) as string[];
    if (declared.length > 0) return Array.from(new Set(declared));
    return Object.keys(m.stats || {}).filter(p => {
      const s = m.stats[p];
      return s && (s.touches > 0 || s.forcedErrors > 0 || s.unforcedErrors > 0 || s.winners > 0);
    });
  };

  // Extract unique players
  const allPlayerNames = Array.from(
    new Set(matches.flatMap(getMatchActivePlayers))
  );

  const filteredMatches = matches.filter((m) => {
    if (filterPlayer === 'all') return true;
    return getMatchActivePlayers(m).includes(filterPlayer);
  });

  return (
    <div id="match-history-section" className="bg-[#0b1220] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 space-y-5">
      {/* Hidden file input for restore */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportData(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-white">
              Historial de Partidos
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/30">
              {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico de actas, resultados y marcadores oficiales.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={filterPlayer}
              onChange={(e) => setFilterPlayer(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">Todos los jugadores</option>
              {allPlayerNames.map((name, idx) => (
                <option key={`filter-opt-${idx}-${name}`} value={name} className="bg-slate-900 text-white">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={onExportData}
            title="Descargar copia de seguridad con todos los partidos en JSON"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Todo (JSON)</span>
          </button>

          {/* Import Single Button */}
          <button
            type="button"
            onClick={() => setIsImportSingleModalOpen(true)}
            title="Importar un partido en formato JSON"
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importar JSON</span>
          </button>

          {/* Reset button (Admin only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={onResetToDefault}
              title="Restablecer partidos de prueba"
              className="p-2 bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Matches List */}
      <div className="space-y-3.5">
        {filteredMatches.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 text-slate-400 text-xs space-y-2">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-bold text-slate-300">No hay partidos que mostrar</div>
            <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
              No se han encontrado encuentros con el filtro seleccionado.
            </p>
          </div>
        ) : (
          filteredMatches.map((match) => {
            const isCompleted = match.isCompleted !== false;
            const t1Won = match.winnerTeam === 1;
            const t2Won = match.winnerTeam === 2;

            const t1Name = match.team1?.name || `${match.team1?.player1 || 'J1'} & ${match.team1?.player2 || 'J2'}`;
            const t2Name = match.team2?.name || `${match.team2?.player1 || 'J3'} & ${match.team2?.player2 || 'J4'}`;

            return (
              <div
                key={match.id}
                id={`match-card-${match.id}`}
                className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 transition shadow-lg space-y-3 group"
              >
                {/* Row 1: Badges (Fecha, Estado, MVP, Pista) */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Fecha editable */}
                    {editingDateMatchId === match.id ? (
                      <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-emerald-500">
                        <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                        <input
                          type="date"
                          value={tempDate}
                          onChange={(e) => setTempDate(e.target.value)}
                          className="bg-slate-950 text-xs text-white px-1.5 py-0.5 rounded focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (tempDate && onUpdateMatch) {
                              onUpdateMatch({ ...match, date: tempDate });
                              setEditingDateMatchId(null);
                            }
                          }}
                          className="p-1 bg-emerald-500 text-slate-950 rounded cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDateMatchId(null)}
                          className="p-1 bg-slate-800 text-slate-300 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-semibold">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span>{match.date || 'Sin fecha'}</span>
                        {isAdmin && onUpdateMatch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTempDate(match.date || '');
                              setEditingDateMatchId(match.id);
                            }}
                            className="text-slate-500 hover:text-emerald-400 ml-1 cursor-pointer"
                            title="Modificar fecha"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Estado del Partido */}
                    {isCompleted ? (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        FINALIZADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black rounded-lg flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400" />
                        EN JUEGO / A MEDIAS
                      </span>
                    )}

                    {/* MVP */}
                    {match.mvp && (
                      <span className="px-2 py-0.5 bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        MVP: {match.mvp}
                      </span>
                    )}

                    {/* Pista / Club */}
                    {match.court && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.court}
                      </span>
                    )}
                  </div>

                  {/* Título opcional si existe */}
                  {match.title && (
                    <span className="text-xs font-semibold text-slate-400">
                      {match.title}
                    </span>
                  )}
                </div>

                {/* Row 2: Jugadores & Marcador (Fila Principal) */}
                <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  
                  {/* Pareja 1 */}
                  <div className={`flex-1 text-center sm:text-left ${t1Won ? 'font-black text-emerald-300' : 'text-slate-300'}`}>
                    <div className="text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1.5">
                      {t1Won && <span className="text-amber-400 text-xs">👑</span>}
                      <span>{t1Name}</span>
                    </div>
                  </div>

                  {/* Marcador Central */}
                  <div className="px-4 py-1.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-center shadow-inner">
                    <span className="text-sm sm:text-base font-black font-mono text-white tracking-wider">
                      {match.setsScore || '0-0'}
                    </span>
                  </div>

                  {/* Pareja 2 */}
                  <div className={`flex-1 text-center sm:text-right ${t2Won ? 'font-black text-emerald-300' : 'text-slate-300'}`}>
                    <div className="text-xs sm:text-sm flex items-center justify-center sm:justify-end gap-1.5">
                      <span>{t2Name}</span>
                      {t2Won && <span className="text-amber-400 text-xs">👑</span>}
                    </div>
                  </div>

                </div>

                {/* Row 3: Botones de Acción (Ver Acta, Editar Resultado, Exportar JSON, Retomar, Eliminar) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  
                  {/* Left Action: Ver Acta */}
                  <button
                    type="button"
                    onClick={() => onSelectMatch(match)}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Ver Acta</span>
                  </button>

                  {/* Right Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Retomar partido si está a medias */}
                    {!isCompleted && onResumeMatch && (
                      <button
                        type="button"
                        onClick={() => onResumeMatch(match)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1 cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Retomar Partido</span>
                      </button>
                    )}

                    {/* Editar Resultado (Solo Admin o acceso directo) */}
                    {onUpdateMatch && (
                      <button
                        type="button"
                        onClick={() => setEditingResultMatch(match)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        title="Modificar resultado de sets o ganador"
                      >
                        <Pencil className="w-3 h-3 text-emerald-400" />
                        <span>Editar Resultado</span>
                      </button>
                    )}

                    {/* Exportar JSON individual */}
                    <button
                      type="button"
                      onClick={() => downloadSingleMatchJSON(match)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      title="Descargar este partido en archivo JSON"
                    >
                      <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Exportar JSON</span>
                    </button>

                    {/* Eliminar (Solo Admin) */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Seguro que deseas eliminar el acta "${match.title}"?`)) {
                            onDeleteMatch(match.id);
                          }
                        }}
                        className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-200 rounded-xl transition cursor-pointer"
                        title="Eliminar partido"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Import Single Match Modal */}
      {isImportSingleModalOpen && onImportSingleMatch && (
        <ImportSingleMatchModal
          isOpen={isImportSingleModalOpen}
          onClose={() => setIsImportSingleModalOpen(false)}
          onImportMatch={onImportSingleMatch}
          existingMatches={matches}
        />
      )}

      {/* Edit Match Result Modal */}
      {editingResultMatch && onUpdateMatch && (
        <EditMatchResultModal
          match={editingResultMatch}
          isOpen={Boolean(editingResultMatch)}
          onClose={() => setEditingResultMatch(null)}
          onSave={(updated) => {
            onUpdateMatch(updated);
            setEditingResultMatch(null);
          }}
        />
      )}
    </div>
  );
};
