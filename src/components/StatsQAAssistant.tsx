import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  Bot,
  RefreshCw,
  Trophy,
  Shield,
  Zap,
  Activity,
  Copy,
  Check,
  Share2,
  Mic,
  MicOff,
  HelpCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { PadelMatch, PlayerHistorySummary, StatsQAMessage, StatsQAResponse } from '../types';
import { calculateGlobalRallyAnalytics } from '../utils/statsCalculator';

interface StatsQAAssistantProps {
  matches: PadelMatch[];
  playerHistories: PlayerHistorySummary[];
  onSelectPlayerForCharts?: (playerName: string) => void;
}

const PRESET_QUESTIONS = [
  { label: '🎯 Quién Fuerza a Quién', text: '¿Quién fuerza más puntos a los rivales y a quién se los hace?' },
  { label: '🔥 Punto Más Largo', text: '¿Cuál ha sido el punto o peloteo más largo de todos los partidos?' },
  { label: '🏆 Mejor Winrate', text: '¿Quién tiene el porcentaje de victorias más alto y cuántos partidos ha ganado?' },
  { label: '💥 Máximo Rematador', text: '¿Quién es el jugador más ofensivo y con más golpes ganadores (winners)?' },
  { label: '🛡️ Muro Defensivo', text: '¿Quién comete menos errores no forzados por partido?' },
  { label: '⚖️ Mejor Balance Neto', text: '¿Quién tiene el mejor balance neto entre winners y errores no forzados (W/ENF)?' },
  { label: '🎾 Mayor Volumen de Toques', text: '¿Quién es el jugador que más toques de pala y volumen de juego tiene?' },
  { label: '📊 Comparativa General', text: 'Hazme una comparativa detallada del rendimiento de todos los jugadores.' },
  { label: '👥 Sinergia de Parejas', text: '¿Qué combinación de pareja ha demostrado mejores resultados en los partidos?' },
  { label: '🔥 Jugador Clutch', text: '¿Quién es el jugador más decisivo en los momentos de mayor presión?' }
];

export const StatsQAAssistant: React.FC<StatsQAAssistantProps> = ({
  matches,
  playerHistories,
  onSelectPlayerForCharts
}) => {
  const [messages, setMessages] = useState<StatsQAMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `👋 ¡Hola! Soy tu **Analista de Datos y Entrenador de Pádel**.

Tengo indexados **${matches.length} partidos** y el historial completo de **${playerHistories.length} jugadores** (${playerHistories.map(p => p.name).join(', ')}).

Puedes preguntarme cualquier cosa:
• Estadísticas individuales de cada jugador (toques, winners, fallos, winrate).
• Comparativas directas entre jugadores o parejas.
• Cuál fue el partido más ajustado o con más peloteos.
• Consejos tácticos y áreas de mejora basados en números reales.

*Elige una de las preguntas rápidas abajo o escribe / dicta tu propia consulta.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: [
          '¿Quién tiene el mejor porcentaje de victorias?',
          '¿Quién hace más winners y remates?',
          '¿Quién comete menos errores no forzados?'
        ]
      }
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(transcript);
          handleAskQuestion(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta reconocimiento de voz nativo. Por favor, escribe tu pregunta.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  const handleAskQuestion = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: StatsQAMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch('/api/ask-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          matches,
          playerHistories,
          conversationHistory
        })
      });

      if (!res.ok) {
        throw new Error('Error en el servidor de respuestas');
      }

      const data: StatsQAResponse = await res.json();

      const botMessage: StatsQAMessage = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        text: data.answer || 'No se pudo generar una respuesta precisa.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: data.suggestedQuestions,
        highlightedStats: data.highlightedStats
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Error asking stats:', err);
      // Client-side statistical fallback
      const q = trimmed.toLowerCase();
      let fallbackAnswer = '';
      const rallyData = calculateGlobalRallyAnalytics(matches);
      const found = playerHistories.find(p => q.includes(p.name.toLowerCase()));

      if (q.includes('fuerza') || q.includes('forzad') || q.includes('provoc') || q.includes('quién a quién')) {
        const topForcer = rallyData.forcingRanking[0];
        const forcersList = rallyData.forcingRanking.map((f, i) => 
          `• **${i + 1}. ${f.forcingPlayer}**: Provocó **${f.totalForced} errores forzados** (su principal víctima fue **${f.topVictim}** con ${f.topVictimCount} errores provocados)`
        ).join('\n');

        fallbackAnswer = `🎯 **Análisis de Errores Forzados y Presión Táctica:**\n\n` +
          `El jugador que más puntos y errores fuerza a los rivales es **${topForcer?.forcingPlayer || 'N/A'}**, con un total de **${topForcer?.totalForced || 0} errores forzados provocados**.\n\n` +
          `**Ranking de Provocación:**\n${forcersList}\n\n` +
          `*La relación de toques continuos y cambio de ritmo en la red determina quién descoloca y presiona con mayor éxito al rival.*`;
      } else if (q.includes('principio') || q.includes('primer punto') || q.includes('primeros puntos') || q.includes('primer juego') || q.includes('primer winner') || q.includes('primer error') || q.includes('primer saque') || q.includes('inicio') || q.includes('orden de toques') || q.includes('secuencia de toques')) {
        const matchWithRallies = matches.find(m => (m.pointRallies && m.pointRallies.length > 0) || (m.inProgressScoreboard?.pointsHistory && m.inProgressScoreboard.pointsHistory.length > 0)) || matches[0];
        if (matchWithRallies) {
          const rallies = matchWithRallies.pointRallies || [];
          const ptsHist = matchWithRallies.inProgressScoreboard?.pointsHistory || [];
          let pointsList: string[] = [];

          if (rallies.length > 0) {
            pointsList = rallies.slice(0, 5).map((r, i) => {
              const pNum = r.pointNumber || (i + 1);
              const server = r.servingPlayer || 'Sacador';
              const seq = r.touchOrder && r.touchOrder.length > 0 ? r.touchOrder.join(' ➔ ') : (r.pointWinnerPlayer || 'Peloteo');
              const endLabel = r.endingAction === 'winner' ? `Winner ⚡ (${r.pointWinnerPlayer})` : r.endingAction === 'forced_error' ? `Error forzado 🛡️` : `Error no forzado ❌`;
              return `• **Punto ${pNum} (${r.scoreSnapshotText || r.pointsContext || 'Inicio'}):** Sacó **${server}** (${r.rallyLength || 1} toques)\n  ↳ \`${seq}\` (${endLabel})`;
            });
          } else if (ptsHist.length > 0) {
            pointsList = ptsHist.slice(0, 5).map((h, i) => {
              const seq = h.touchOrder ? h.touchOrder.join(' ➔ ') : (h.attributedPlayer || 'Golpe');
              return `• **Punto ${i + 1} (${h.scoreText || 'Marcador'}):** ${h.rallyLength || 1} toques • \`${seq}\``;
            });
          }

          const firstWinner = rallies.find(r => r.endingAction === 'winner');

          fallbackAnswer = `🎾 **Puntos y Toques del Inicio del Partido:**\n\n` +
            `Partido: *${matchWithRallies.title || 'Partido'}*\n\n` +
            (pointsList.length > 0 ? pointsList.join('\n\n') : 'No hay peloteos iniciales registrados.') +
            `\n\n• **Primer Winner:** ${firstWinner ? `**${firstWinner.pointWinnerPlayer}** (Punto ${firstWinner.pointNumber || 1})` : 'Ninguno en los primeros puntos.'}`;
        } else {
          fallbackAnswer = `🎾 No hay partidos registrados con detalle de toques iniciales.`;
        }
      } else if (q.includes('largo') || q.includes('peloteo') || q.includes('duraci') || q.includes('punto más') || q.includes('top 5') || q.includes('top5')) {
        const topRally = rallyData.topLongestGlobal[0];
        if (topRally) {
          const server = topRally.servingPlayer || (topRally.touchOrder && topRally.touchOrder[0]) || 'el sacador';
          const finisher = topRally.pointWinnerPlayer || topRally.forcedByPlayer || (topRally.touchOrder && topRally.touchOrder[topRally.touchOrder.length - 1]) || 'el rematador';
          const moment = topRally.scoreContextDescription || 'en el 40-40 yendo 3-0 en el 1º set';

          const sequenceText = topRally.touchOrder && topRally.touchOrder.length > 0 
            ? `\n\n**Secuencia de toques:** ${topRally.touchOrder.slice(0, 10).join(' ➔ ')}${topRally.touchOrder.length > 10 ? ` ➔ ...(+${topRally.touchOrder.length - 10} más)` : ''}`
            : '';

          fallbackAnswer = `🔥 **Punto Más Largo de los Partidos Registrados:**\n\n` +
            `• **Longitud:** **${topRally.rallyLength} toques de pala**\n` +
            `• **Momento exacto:** Ocurrió **${moment}**.\n` +
            `• **Protagonistas:** Empezó sacando **${server}** y lo cerró **${finisher}** (${topRally.endingAction === 'winner' ? 'Winner ⚡' : topRally.endingAction === 'forced_error' ? 'Error forzado 🛡️' : 'Punto decisivo'}).\n` +
            `• **Partido:** *${topRally.matchTitle || 'Partido'}* (${topRally.matchDate || ''})\n` +
            `• **Desenlace:** ${topRally.description || 'Punto disputado hasta el límite'}` +
            sequenceText;
        } else {
          fallbackAnswer = `🔥 No hay suficientes registros de toques detallados para calcular el punto más largo.`;
        }
      } else if (found) {
        fallbackAnswer = `📊 **Estadísticas de ${found.name}:**\n\n• Victorias: **${found.matchesWon}/${found.matchesPlayed}** (${found.winRate}%)\n• Toques medios: **${found.avgTouches}** (Total: ${found.totalTouches})\n• Winners medios: **${found.avgWinners}** (Total: ${found.totalWinners})\n• Errores no forzados medios: **${found.avgUnforcedErrors}** (Total: ${found.totalUnforcedErrors})\n• Balance W/ENF: **${found.netDifferential >= 0 ? '+' : ''}${found.netDifferential}**`;
      } else {
        const bestWinrate = [...playerHistories].sort((a, b) => b.winRate - a.winRate)[0];
        const bestWinners = [...playerHistories].sort((a, b) => b.avgWinners - a.avgWinners)[0];
        const topForcer = rallyData.forcingRanking[0];
        fallbackAnswer = `🎾 **Resumen Rápido:**\n\n• **Líder en Victorias:** ${bestWinrate?.name || 'N/A'} (${bestWinrate?.winRate}%)\n• **Más Ofensivo (Winners):** ${bestWinners?.name || 'N/A'} (${bestWinners?.avgWinners} winners/partido)\n• **Mayor Presión (Forzados):** ${topForcer?.forcingPlayer || 'N/A'} (${topForcer?.totalForced || 0} errores provocados)\n\nPuedes consultar cualquier detalle numérico de los ${matches.length} partidos registrados.`;
      }

      const botMessage: StatsQAMessage = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        text: fallbackAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsApp = (text: string) => {
    const cleanText = text.replace(/\*\*/g, '*');
    const msg = `🎾 *CONSULTA ESTADÍSTICA DE PÁDEL* 🎾\n\n${cleanText}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-fresh',
        sender: 'assistant',
        text: `✨ Chat reiniciado. ¿Qué estadística o curiosidad de los partidos o jugadores te gustaría consultar hoy?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: [
          '¿Quién tiene el mejor porcentaje de victorias?',
          '¿Quién comete menos errores no forzados?',
          '¿Cómo le va a cada pareja?'
        ]
      }
    ]);
  };

  return (
    <div id="stats-qa-container" className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Consultas & Preguntas Estadísticas IA
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-500/30">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pregunta cualquier dato o comparativa sobre los <strong className="text-indigo-300">{matches.length} partidos</strong> y <strong className="text-indigo-300">{playerHistories.length} jugadores</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-clear-qa-chat"
              type="button"
              onClick={handleClearHistory}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Reiniciar conversación"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpiar Chat</span>
            </button>
          </div>
        </div>

        {/* Quick Player Filter Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
            <User className="w-3 h-3 text-indigo-400" />
            Preguntar sobre:
          </span>
          {playerHistories.map((player) => (
            <button
              key={player.name}
              id={`chip-player-${player.name.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => handleAskQuestion(`¿Cómo son las estadísticas y el rendimiento de ${player.name}?`)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 text-xs font-medium transition whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[9px] font-black">
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span>{player.name}</span>
              <span className="text-[10px] text-slate-500">({player.winRate}%)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Questions Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
        <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>Preguntas frecuentes recomendadas (1 clic):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_QUESTIONS.map((preset, index) => (
            <button
              key={index}
              id={`btn-preset-q-${index}`}
              type="button"
              disabled={isLoading}
              onClick={() => handleAskQuestion(preset.text)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 hover:border-indigo-500 text-slate-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Conversation Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[560px] overflow-hidden">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-md ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-white/10 text-[11px] opacity-75">
                    <span className="font-semibold">{isUser ? 'Tú' : 'Entrenador & Analista IA'}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message body with parsed simple markdown */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.text.split('\n').map((line, idx) => {
                      // Process bold text
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <div key={idx} className={line.startsWith('•') || line.startsWith('-') ? 'pl-2 py-0.5' : 'py-0.5'}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pIdx} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Highlighted Stat Cards */}
                  {msg.highlightedStats && msg.highlightedStats.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {msg.highlightedStats.map((stat, sIdx) => (
                        <div
                          key={sIdx}
                          className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between shadow-inner"
                        >
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {stat.label}
                          </span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-base font-black text-indigo-300">
                              {stat.value}
                            </span>
                            {stat.badge && (
                              <span className="text-[9px] bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]">
                                {stat.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggested Follow-up questions */}
                  {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                      <div className="text-[11px] font-semibold text-indigo-300 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Preguntas de seguimiento sugeridas:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedQuestions.map((sug, sugIdx) => (
                          <button
                            key={sugIdx}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleAskQuestion(sug)}
                            className="text-left text-xs bg-slate-900/90 hover:bg-indigo-900/40 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/80 hover:border-indigo-500/50 transition cursor-pointer"
                          >
                            👉 {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions (Copy / Share) for assistant messages */}
                  {!isUser && (
                    <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="px-2 py-1 rounded-md hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Copiar texto"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-[11px]">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(msg.text)}
                        className="px-2 py-1 rounded-md hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
                        title="Compartir por WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-4 shadow-md flex items-center gap-3 text-sm text-indigo-300">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Analizando partidos y estadísticas con IA...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Field & Voice Controls */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion(inputValue);
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Dictation Button */}
            <button
              id="btn-voice-dictation-qa"
              type="button"
              onClick={toggleVoiceRecognition}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={isListening ? 'Detener grabación de voz' : 'Dictar pregunta por voz'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input box */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                id="input-qa-question"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? 'Escuchando tu voz...' : 'Escribe tu pregunta (ej. ¿quién comete menos errores?, ¿cómo juega Carlos?)...'}
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
              />
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-qa-question"
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 font-bold text-sm shadow-md shadow-indigo-600/20 disabled:shadow-none transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <span>Preguntar</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span>💡 Soporta preguntas en lenguaje natural sobre jugadores, parejas, victorias, toques y récords.</span>
            {isListening && <span className="text-rose-400 font-semibold animate-pulse">🔴 Grabando micrófono...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
