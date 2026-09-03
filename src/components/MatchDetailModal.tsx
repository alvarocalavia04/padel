import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Trophy, 
  Calendar, 
  MapPin, 
  Activity, 
  Zap, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  MessageSquare, 
  Flame, 
  Youtube, 
  ExternalLink,
  Share2,
  Check,
  FileText,
  Loader2,
  Quote,
  Layers,
  ArrowRight,
  ShieldCheck,
  Target,
  Pencil,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { PadelMatch, MatchNarrativeChronicle, MatchRallyAnalytics } from '../types';
import { 
  getPlayerColor, 
  generateLocalMatchNarrativeChronicle, 
  calculateMatchRallyAnalytics,
  getRallyMomentDescription,
  getRallyNarrativeSummary
} from '../utils/statsCalculator';
import { extractYouTubeVideoId } from './YouTubeVideoStudio';
import { RotatableYouTubePlayer } from './RotatableYouTubePlayer';
import { EditMatchResultModal } from './EditMatchResultModal';
import { downloadSingleMatchJSON, downloadSingleMatchCSV } from '../utils/matchExportImport';

interface MatchDetailModalProps {
  match: PadelMatch | null;
  onClose: () => void;
  onResumeMatch?: (match: PadelMatch) => void;
  onUpdateMatch?: (updatedMatch: PadelMatch) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose, onResumeMatch, onUpdateMatch }) => {
  if (!match) return null;

  const [chronicle, setChronicle] = useState<MatchNarrativeChronicle | null>(null);
  const [isLoadingChronicle, setIsLoadingChronicle] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chronicle' | 'stats' | 'rallies' | 'video'>('chronicle');

  // Date editing state
  const [isEditingDate, setIsEditingDate] = useState<boolean>(false);
  const [tempDate, setTempDate] = useState<string>(match.date || '');
  const [isEditResultModalOpen, setIsEditResultModalOpen] = useState<boolean>(false);

  // Reset tempDate when match changes
  useEffect(() => {
    if (match) {
      setTempDate(match.date || '');
      setIsEditingDate(false);
    }
  }, [match]);

  // Video transformation states
  const [videoRotation, setVideoRotation] = useState<number>(match.youtubeRotation || 0);
  const [videoMirror, setVideoMirror] = useState<boolean>(match.youtubeMirror || false);
  const [videoZoom, setVideoZoom] = useState<number>(match.youtubeZoom || 1);

  const rallyAnalytics: MatchRallyAnalytics = useMemo(() => {
    return calculateMatchRallyAnalytics(match);
  }, [match]);

  useEffect(() => {
    if (match) {
      // Initialize with deterministic fallback or existing chronicle
      const initialChronicle = generateLocalMatchNarrativeChronicle(match);
      setChronicle(initialChronicle);
    }
  }, [match]);

  const handleFetchAIChronicle = async () => {
    if (!match) return;
    setIsLoadingChronicle(true);
    try {
      const res = await fetch('/api/match-chronicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.headline) {
          setChronicle(data);
          return;
        }
      }
      setChronicle(generateLocalMatchNarrativeChronicle(match));
    } catch (e) {
      console.warn('Fallback to local chronicle:', e);
      setChronicle(generateLocalMatchNarrativeChronicle(match));
    } finally {
      setIsLoadingChronicle(false);
    }
  };

  const handleCopyWhatsApp = () => {
    if (!chronicle) return;
    navigator.clipboard.writeText(chronicle.whatsappShareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const declaredPlayers = [match.team1?.player1, match.team1?.player2, match.team2?.player1, match.team2?.player2].filter(Boolean) as string[];
  const players = declaredPlayers.length > 0
    ? Array.from(new Set(declaredPlayers))
    : Object.keys(match.stats || {}).filter(p => {
        const s = match.stats[p];
        return s && (s.touches > 0 || s.forcedErrors > 0 || s.unforcedErrors > 0 || s.winners > 0);
      });
  const ytId = match.youtubeUrl ? extractYouTubeVideoId(match.youtubeUrl) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {!isEditingDate ? (
                <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    {match.date}
                  </span>
                  {onUpdateMatch && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempDate(match.date || '');
                        setIsEditingDate(true);
                      }}
                      className="ml-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-lg cursor-pointer transition flex items-center gap-1 font-medium border border-slate-700/50"
                      title="Cambiar fecha del partido (actualiza la cronología y la evolución de los jugadores)"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Cambiar fecha</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-emerald-500/50 shadow-lg">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                  <input
                    type="date"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    className="bg-slate-950 text-xs font-semibold text-white px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tempDate && onUpdateMatch) {
                        onUpdateMatch({
                          ...match,
                          date: tempDate
                        });
                        setIsEditingDate(false);
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Guardar fecha"
                  >
                    <Check className="w-3 h-3" />
                    <span>Guardar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempDate(match.date || '');
                      setIsEditingDate(false);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {match.isCompleted === false ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                  ⏳ PARTIDO EN CURSO
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ✅ FINALIZADO
                </span>
              )}
              {match.court && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {match.court}
                </span>
              )}
              {match.mvp && (
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> MVP: {match.mvp}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-white">{match.title}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
              <span className={`font-bold ${match.winnerTeam === 1 ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-200'}`}>
                {match.winnerTeam === 1 && <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />}
                {match.team1.name || `${match.team1.player1} & ${match.team1.player2}`}
              </span>
              <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold rounded-lg border border-emerald-500/40 text-base">
                {match.setsScore}
              </span>
              <span className={`font-bold ${match.winnerTeam === 2 ? 'text-emerald-400 flex items-center gap-1' : 'text-slate-200'}`}>
                {match.winnerTeam === 2 && <Trophy className="w-3.5 h-3.5 text-amber-400 inline" />}
                {match.team2.name || `${match.team2.player1} & ${match.team2.player2}`}
              </span>

              {onUpdateMatch && (
                <button
                  type="button"
                  onClick={() => setIsEditResultModalOpen(true)}
                  className="text-xs bg-slate-800/90 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer shadow-sm ml-1"
                  title="Actualizar resultado final de sets, ganadores (V/D) o estado completado"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Editar Resultado / V-D</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Match Data */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => downloadSingleMatchJSON(match)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                title="Descargar este partido completo en formato JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={() => downloadSingleMatchCSV(match)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                title="Descargar hoja de cálculo CSV con las estadísticas de este partido"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>

            {match.isCompleted === false && onResumeMatch && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResumeMatch(match);
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/25"
              >
                <span>▶️ Retomar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-950/80 px-6 pt-3 border-b border-slate-800 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('chronicle')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'chronicle'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📰 Crónica & Resumen Narrativo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'stats'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>📊 Estadísticas Detalladas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rallies')}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'rallies'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>🎾 Peloteos & Quién Fuerza a Quién</span>
          </button>
          {ytId && (
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`pb-3 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'video'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Youtube className="w-4 h-4" />
              <span>🎥 Vídeo del Partido</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: CHRONICLE & NARRATIVE SUMMARY */}
          {activeTab === 'chronicle' && chronicle && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Headline & Subheadline banner */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/30 rounded-2xl p-5 space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Crónica Oficial del Encuentro
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchAIChronicle}
                      disabled={isLoadingChronicle}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {isLoadingChronicle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-emerald-400" />}
                      <span>Regenerar con IA</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      {copiedShare ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                      <span>{copiedShare ? '¡Copiado!' : 'Copiar para WhatsApp'}</span>
                    </button>
                  </div>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                  {chronicle.headline}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  {chronicle.subheadline}
                </p>
              </div>

              {/* Full story paragraphs */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Relato del Partido
                </div>
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2.5 whitespace-pre-line font-sans">
                  {chronicle.fullStory}
                </div>
              </div>

              {/* Turning point card */}
              {chronicle.keyTurningPoint && (
                <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-2xl space-y-1.5">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Punto de Inflexión del Partido
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {chronicle.keyTurningPoint}
                  </p>
                </div>
              )}

              {/* Quotes */}
              {chronicle.postMatchQuotes && chronicle.postMatchQuotes.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-emerald-400" />
                    Declaraciones Post-Partido
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {chronicle.postMatchQuotes.map((q, idx) => (
                      <div key={`quote-${idx}`} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="text-xs font-bold text-emerald-400">
                          {q.speaker}:
                        </div>
                        <p className="text-xs text-slate-300 italic">
                          {q.quote}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INDIVIDUAL STATS & BREAKDOWN */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Rendimiento Individual de los 4 Jugadores:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {players.map((pName, idx) => {
                    const stats = match.stats[pName] || { touches: 0, forcedErrors: 0, unforcedErrors: 0, winners: 0 };
                    const pColor = getPlayerColor(pName);
                    const net = stats.winners - stats.unforcedErrors;

                    return (
                      <div key={`modal-player-${idx}-${pName}`} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pColor }} />
                          <div className="font-bold text-white text-sm truncate">{pName}</div>
                        </div>

                        <div className="space-y-1.5 text-xs font-mono">
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400 font-sans">Toques:</span>
                            <span className="font-bold text-emerald-400">{stats.touches}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400 font-sans">Err. Forzados:</span>
                            <span className="font-bold text-amber-400">{stats.forcedErrors}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400 font-sans">Err. No Forzados:</span>
                            <span className="font-bold text-rose-400">{stats.unforcedErrors}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400 font-sans">Winners:</span>
                            <span className="font-bold text-cyan-400">{stats.winners}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex justify-between">
                            <span className="text-slate-400 font-sans">Balance W/ENF:</span>
                            <span className={`font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {net >= 0 ? `+${net}` : net}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Highlights */}
              {match.highlights && match.highlights.length > 0 && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    Momentos Destacados:
                  </h4>
                  <ul className="space-y-1.5">
                    {match.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Audio notes transcripts if present */}
              {match.audioNotes && match.audioNotes.length > 0 && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Transcripciones de Audio Vinculadas
                  </h4>
                  <div className="space-y-2">
                    {match.audioNotes.map((note) => (
                      <div key={note.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1">
                          {note.audioName || 'Audio del partido'} - {new Date(note.timestamp).toLocaleTimeString('es-ES')}
                        </div>
                        <p className="italic">"{note.transcription}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RALLIES & WHO FORCES WHOM */}
          {activeTab === 'rallies' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 1. LONGEST RALLY SPOTLIGHT */}
              {rallyAnalytics.longestRally ? (
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/50 border-2 border-emerald-500/50 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        <Flame className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="text-sm font-black uppercase text-white tracking-wide">
                          Punto / Peloteo Más Largo del Partido
                        </h4>
                        <p className="text-[11px] text-emerald-400/90 font-medium">
                          Récord absoluto de toques e intercambios
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-mono font-black text-xs rounded-full shadow-lg shadow-emerald-500/30 animate-pulse">
                        🔥 {rallyAnalytics.longestRally.rallyLength} TOQUES DE PALA
                      </span>
                      {rallyAnalytics.longestRally.timeSec !== undefined && (
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 font-mono text-xs rounded-full border border-slate-700">
                          ⏱️ {Math.floor(rallyAnalytics.longestRally.timeSec / 60)}:{(rallyAnalytics.longestRally.timeSec % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Highlight: EXACT MATCH MOMENT (Where it happened in the match) */}
                  <div className="p-3.5 bg-slate-950/90 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <span className="text-sm">📍</span>
                        <span className="uppercase text-[10px] tracking-wider text-slate-400 font-sans">Momento del Partido:</span>
                        <span className="text-amber-300 font-mono">
                          {getRallyMomentDescription(rallyAnalytics.longestRally, match)}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                        Punto Pareja {rallyAnalytics.longestRally.pointWinnerTeam || 1}
                      </span>
                    </div>

                    {/* Quick Badge Breakdown */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                      {rallyAnalytics.longestRally.setNumber && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono font-semibold">
                          Set: {rallyAnalytics.longestRally.setNumber}º
                        </span>
                      )}
                      {rallyAnalytics.longestRally.gamesContext && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono font-semibold">
                          Marcador Juegos: {rallyAnalytics.longestRally.gamesContext}
                        </span>
                      )}
                      {rallyAnalytics.longestRally.pointsContext && (
                        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-mono font-bold">
                          Puntuación: {rallyAnalytics.longestRally.pointsContext}
                        </span>
                      )}
                      {rallyAnalytics.longestRally.servingPlayer && (
                        <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                          🎾 Saque: <strong>{rallyAnalytics.longestRally.servingPlayer}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Narrative Quote of the Point */}
                  <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-xs text-slate-200 flex items-start gap-2.5">
                    <Quote className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="italic leading-relaxed font-medium">
                      "{getRallyNarrativeSummary(rallyAnalytics.longestRally, match)}"
                    </p>
                  </div>

                  {/* Sequential Touch Order Breadcrumb */}
                  {rallyAnalytics.longestRally.touchOrder && rallyAnalytics.longestRally.touchOrder.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        Secuencia Exacta Golpe a Golpe ({rallyAnalytics.longestRally.touchOrder.length} impactos):
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center gap-1.5 max-h-48 overflow-y-auto">
                        {rallyAnalytics.longestRally.touchOrder.map((playerName, tIdx) => {
                          const pColor = getPlayerColor(playerName);
                          const isFirst = tIdx === 0;
                          const isLast = tIdx === rallyAnalytics.longestRally!.touchOrder!.length - 1;

                          return (
                            <React.Fragment key={`touch-${tIdx}-${playerName}`}>
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm ${
                                  isLast
                                    ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400'
                                    : isFirst
                                    ? 'bg-cyan-950 text-cyan-200 border border-cyan-700 ring-1 ring-cyan-500/40'
                                    : 'bg-slate-900 text-slate-200 border border-slate-800'
                                }`}
                              >
                                <span className="text-[10px] opacity-70">#{tIdx + 1}</span>
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                                <span>{playerName}</span>
                                {isFirst && <span className="text-[9px] uppercase font-black bg-cyan-900 text-cyan-200 px-1 rounded">Saque</span>}
                                {isLast && <span className="text-[9px] uppercase font-black bg-slate-950 text-amber-300 px-1 rounded">Cierre</span>}
                              </span>
                              {!isLast && <span className="text-slate-600 text-xs font-mono">➔</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                  No hay suficientes datos de peloteo registrados para este partido.
                </div>
              )}

              {/* 2. WHO FORCES WHOM (FORCED ERRORS PROVOCATION RANKING) */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                      ¿Quién Fuerza Más Puntos? (Presión y Errores Provocados)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Basado en el orden de toques</span>
                </div>

                {rallyAnalytics.topForcingPlayers && rallyAnalytics.topForcingPlayers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rallyAnalytics.topForcingPlayers.map((fItem, fIdx) => {
                      const pColor = getPlayerColor(fItem.player);
                      return (
                        <div
                          key={`forcer-${fIdx}-${fItem.player}`}
                          className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 hover:border-cyan-500/40 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black flex items-center justify-center font-mono">
                                #{fIdx + 1}
                              </span>
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pColor }} />
                              <span className="font-bold text-white text-xs sm:text-sm">{fItem.player}</span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono font-black border border-cyan-800/60">
                              ⚡ {fItem.totalForced} forzados
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 space-y-1 pt-1 border-t border-slate-800/70">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">Víctima principal:</span>
                              <span className="font-bold text-amber-300">
                                {fItem.primaryVictim} ({fItem.countAgainstVictim} veces)
                              </span>
                            </div>

                            {/* Victims breakdown pills */}
                            <div className="flex flex-wrap gap-1 mt-1 pt-1">
                              {Object.entries(fItem.victimBreakdown || {}).map(([vic, count]) => (
                                <span
                                  key={`vic-${vic}`}
                                  className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-slate-300 font-mono border border-slate-800"
                                >
                                  vs {vic}: <strong className="text-cyan-400">{count}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Sin registros de errores forzados en este partido.
                  </p>
                )}
              </div>

              {/* 3. FORCED ERRORS HEAD-TO-HEAD MATRIX */}
              {rallyAnalytics.forcedErrorsMatrix && Object.keys(rallyAnalytics.forcedErrorsMatrix).length > 0 && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Matriz Cruzada de Provocación (Quién a Quién)
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="p-2 font-medium">Jugador que Presiona ↓ / Víctima →</th>
                          {players.map(p => (
                            <th key={`th-${p}`} className="p-2 font-mono text-center truncate max-w-[90px]">
                              {p}
                            </th>
                          ))}
                          <th className="p-2 font-mono text-center text-cyan-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {players.map(forcingP => {
                          const victims = rallyAnalytics.forcedErrorsMatrix[forcingP] || {};
                          const total = Object.values(victims).reduce((a, b) => a + b, 0);

                          return (
                            <tr key={`tr-${forcingP}`} className="hover:bg-slate-900/50 transition">
                              <td className="p-2 font-bold text-white flex items-center gap-1.5 font-sans">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getPlayerColor(forcingP) }} />
                                <span>{forcingP}</span>
                              </td>
                              {players.map(forcedP => {
                                const count = forcingP === forcedP ? '-' : (victims[forcedP] || 0);
                                const isHigh = typeof count === 'number' && count > 0;
                                return (
                                  <td
                                    key={`td-${forcingP}-${forcedP}`}
                                    className={`p-2 text-center ${
                                      forcingP === forcedP
                                        ? 'text-slate-700 bg-slate-900/30'
                                        : isHigh
                                        ? 'text-emerald-400 font-bold bg-emerald-950/20'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {count}
                                  </td>
                                );
                              })}
                              <td className="p-2 text-center font-black text-cyan-400 bg-cyan-950/20">
                                {total}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. RALLY LENGTH METRICS & DISTRIBUTION */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Toques Medios por Punto</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                    {rallyAnalytics.avgTouchesPerPoint}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">impactos promedio</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Puntos Rápidos (1-3 toqs)</div>
                  <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                    {rallyAnalytics.rallyLengthDistribution.short}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">saques y definiciones veloces</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Peloteos Largos (8+ toqs)</div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                    {rallyAnalytics.rallyLengthDistribution.long}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">puntos de alto desgaste</div>
                </div>
              </div>

              {/* 5. TOP 5 LONGEST RALLIES OF THE MATCH */}
              {rallyAnalytics.topLongestRallies && rallyAnalytics.topLongestRallies.length > 0 && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Top 5 Peloteos Más Largos de Este Partido
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      Con momento del partido y protagonistas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {rallyAnalytics.topLongestRallies.map((rally, rIdx) => {
                      const momentText = getRallyMomentDescription(rally, match);
                      const server = rally.servingPlayer || (rally.touchOrder && rally.touchOrder[0]) || 'Jugador';
                      const finisher = rally.pointWinnerPlayer || rally.forcedByPlayer || (rally.touchOrder && rally.touchOrder[rally.touchOrder.length - 1]) || 'Jugador';

                      return (
                        <div
                          key={`top-rally-${rIdx}-${rally.id}`}
                          className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5 hover:border-slate-700 transition"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 font-mono font-black rounded-lg text-xs flex items-center gap-1 ${
                                rIdx === 0 
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                                  : rIdx === 1 
                                  ? 'bg-slate-300 text-slate-950' 
                                  : rIdx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                #{rIdx + 1}
                              </span>
                              <span className="font-bold text-white text-xs">
                                Peloteo #{rIdx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-emerald-400 text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60">
                                🔥 {rally.rallyLength} toques
                              </span>
                              {rally.timeSec !== undefined && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ⏱️ {Math.floor(rally.timeSec / 60)}:{(rally.timeSec % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Match Part / Moment Badge */}
                          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="text-amber-400">📍</span>
                              <span className="text-slate-400 text-[11px]">Momento:</span>
                              <span className="text-amber-300 font-mono font-semibold">
                                {momentText}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-cyan-300 font-mono">
                                🎾 Saque: <strong>{server}</strong>
                              </span>
                              <span className="text-slate-500">➔</span>
                              <span className="text-emerald-300 font-mono">
                                🏁 Cierre: <strong>{finisher}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Full narrative sentence */}
                          <p className="text-xs text-slate-300 italic pl-2 border-l-2 border-emerald-500/60 leading-relaxed">
                            "{getRallyNarrativeSummary(rally, match)}"
                          </p>

                          {/* Touch sequence badges */}
                          {rally.touchOrder && rally.touchOrder.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                              <span className="text-slate-500 uppercase font-sans text-[9px] mr-1">Secuencia:</span>
                              {rally.touchOrder.slice(0, 10).map((p, idx) => {
                                const isFirst = idx === 0;
                                const isLast = idx === rally.touchOrder!.length - 1;
                                const pColor = getPlayerColor(p);

                                return (
                                  <React.Fragment key={`top-touch-${rIdx}-${idx}`}>
                                    <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                      isLast
                                        ? 'bg-amber-500 text-slate-950 font-bold'
                                        : isFirst
                                        ? 'bg-cyan-950 text-cyan-200 border border-cyan-800'
                                        : 'bg-slate-950 text-slate-300'
                                    }`}>
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pColor }} />
                                      <span>{p}</span>
                                      {isFirst && <span className="text-[8px] opacity-80">(Saq)</span>}
                                      {isLast && <span className="text-[8px] opacity-80">(Fin)</span>}
                                    </span>
                                    {idx < Math.min(rally.touchOrder!.length, 10) - 1 && <span>➔</span>}
                                  </React.Fragment>
                                );
                              })}
                              {rally.touchOrder.length > 10 && (
                                <span className="text-slate-500">...+{rally.touchOrder.length - 10} más</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VIDEO EMBED WITH ROTATION & SCALING */}
          {activeTab === 'video' && ytId && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Youtube className="w-4 h-4" />
                    Vídeo del Partido en YouTube
                  </span>
                  <a
                    href={match.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <span>Abrir en YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <RotatableYouTubePlayer
                  videoId={ytId}
                  title={match.title}
                  rotation={videoRotation}
                  onRotationChange={setVideoRotation}
                  mirror={videoMirror}
                  onMirrorChange={setVideoMirror}
                  zoom={videoZoom}
                  onZoomChange={setVideoZoom}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition flex items-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir Crónica</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Edit Match Outcome / Sets Score / Winner Modal */}
      {isEditResultModalOpen && onUpdateMatch && (
        <EditMatchResultModal
          match={match}
          isOpen={isEditResultModalOpen}
          onClose={() => setIsEditResultModalOpen(false)}
          onSave={(updated) => {
            onUpdateMatch(updated);
            setIsEditResultModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

