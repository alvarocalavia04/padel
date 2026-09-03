import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Calendar, 
  Trophy, 
  MapPin, 
  Activity, 
  Zap, 
  AlertTriangle,
  Clipboard,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { PadelMatch } from '../types';
import { validateAndParseMatchData, readSingleMatchFromFile } from '../utils/matchExportImport';
import { getPlayerColor } from '../utils/statsCalculator';

interface ImportSingleMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMatch: (match: PadelMatch, overwriteExisting: boolean) => void;
  existingMatches: PadelMatch[];
}

export const ImportSingleMatchModal: React.FC<ImportSingleMatchModalProps> = ({
  isOpen,
  onClose,
  onImportMatch,
  existingMatches
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pastedJson, setPastedJson] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedMatch, setParsedMatch] = useState<PadelMatch | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [overwriteMode, setOverwriteMode] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if match already exists by ID
  const existingMatchWithSameId = parsedMatch 
    ? existingMatches.find(m => m.id === parsedMatch.id)
    : null;

  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedMatch(null);

    const result = await readSingleMatchFromFile(file);
    if (result.error) {
      setParseError(result.error);
    } else if (result.match) {
      setParsedMatch(result.match);
      setOverwriteMode(Boolean(existingMatches.some(m => m.id === result.match?.id)));
    }
  };

  const handleProcessPasted = () => {
    setParseError(null);
    setParsedMatch(null);
    if (!pastedJson.trim()) {
      setParseError('Por favor pega el texto JSON del partido.');
      return;
    }
    try {
      const parsed = JSON.parse(pastedJson);
      const result = validateAndParseMatchData(parsed);
      if (result.error) {
        setParseError(result.error);
      } else if (result.match) {
        setParsedMatch(result.match);
        setOverwriteMode(Boolean(existingMatches.some(m => m.id === result.match?.id)));
      }
    } catch (err: any) {
      setParseError(`JSON inválido: ${err.message}`);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedMatch) return;

    let finalMatch = { ...parsedMatch };
    if (!overwriteMode && existingMatchWithSameId) {
      // Generate a new ID so it doesn't overwrite
      finalMatch.id = `match-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    onImportMatch(finalMatch, overwriteMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Importar Partido Individual (1 a 1)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Carga un partido exportado previamente en formato JSON para agregarlo a tu historial.
              </p>
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

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Tab Selector: File vs Paste */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('file');
                setParseError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cargar Archivo .JSON</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('paste');
                setParseError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Pegar Código JSON</span>
            </button>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFile(file);
                }}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleProcessFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/20'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                <div className="text-xs font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Haz clic o arrastra aquí tu archivo .json del partido'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Formatos compatibles: JSON de partido individual generado por PadelStats Pro
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Paste JSON */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Pega aquí el contenido JSON del partido (ej: { "title": "Partido...", "date": "2026-02-28", ... })'
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleProcessPasted}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analizar y Validar JSON</span>
              </button>
            </div>
          )}

          {/* Error Notice */}
          {parseError && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">No se pudo interpretar el archivo</div>
                <div className="text-[11px] text-rose-200/80 mt-0.5">{parseError}</div>
              </div>
            </div>
          )}

          {/* PREVIEW OF PARSED MATCH */}
          {parsedMatch && (
            <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Partido Reconocido Correctamente</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {parsedMatch.id.slice(0, 16)}...</span>
              </div>

              {/* Match Card Preview */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-slate-300 text-xs font-semibold rounded-md border border-slate-800 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      {parsedMatch.date}
                    </span>
                    {parsedMatch.court && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {parsedMatch.court}
                      </span>
                    )}
                  </div>

                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs rounded border border-emerald-500/30">
                    {parsedMatch.setsScore}
                  </span>
                </div>

                <div className="text-sm font-black text-white">
                  {parsedMatch.title}
                </div>

                {/* Teams */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-semibold mb-1">Equipo 1</div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPlayerColor(parsedMatch.team1.player1) }} />
                      {parsedMatch.team1.player1} & {parsedMatch.team1.player2}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-semibold mb-1">Equipo 2</div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPlayerColor(parsedMatch.team2.player1) }} />
                      {parsedMatch.team2.player1} & {parsedMatch.team2.player2}
                    </div>
                  </div>
                </div>

                {/* Stats summary */}
                {parsedMatch.stats && Object.keys(parsedMatch.stats).length > 0 && (
                  <div className="pt-2 border-t border-slate-900">
                    <div className="text-[11px] text-slate-400 font-semibold mb-1.5">Estadísticas por jugador:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {Object.keys(parsedMatch.stats).map(pName => {
                        const s = parsedMatch.stats[pName];
                        return (
                          <div key={pName} className="p-1.5 bg-slate-900 rounded-lg text-[10px] font-mono border border-slate-800/80">
                            <div className="font-bold text-white truncate">{pName}</div>
                            <div className="text-slate-400">
                              <span className="text-emerald-400 font-bold">{s.touches}</span> toq | <span className="text-cyan-400 font-bold">{s.winners}</span> win
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Conflict / Overwrite Options */}
              {existingMatchWithSameId && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Este partido ya existe en tu historial</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Existe un partido con el mismo identificador grabado el {existingMatchWithSameId.date} ({existingMatchWithSameId.title}).
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importConflict"
                        checked={overwriteMode}
                        onChange={() => setOverwriteMode(true)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-white text-[11px]">Sobrescribir y actualizar existente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importConflict"
                        checked={!overwriteMode}
                        onChange={() => setOverwriteMode(false)}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-white text-[11px]">Guardar como un nuevo partido</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-950/90 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!parsedMatch}
            onClick={handleConfirmImport}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>📥 Importar este Partido al Historial</span>
          </button>
        </div>

      </div>
    </div>
  );
};
