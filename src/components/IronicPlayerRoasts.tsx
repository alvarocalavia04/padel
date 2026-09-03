import React, { useState, useEffect } from 'react';
import { 
  Laugh, 
  Flame, 
  Sparkles, 
  AlertOctagon, 
  Beer, 
  Share2, 
  Check, 
  RefreshCw, 
  Loader2, 
  ShieldAlert, 
  MessageSquare, 
  HelpCircle,
  Award
} from 'lucide-react';
import { PlayerHistorySummary, PlayerIronicRoast } from '../types';
import { generateLocalPlayerIronicRoasts, getPlayerColor } from '../utils/statsCalculator';

interface IronicPlayerRoastsProps {
  playerHistories: PlayerHistorySummary[];
}

export const IronicPlayerRoasts: React.FC<IronicPlayerRoastsProps> = ({ playerHistories }) => {
  const [roasts, setRoasts] = useState<PlayerIronicRoast[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [copiedRoast, setCopiedRoast] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');

  useEffect(() => {
    if (playerHistories.length > 0) {
      const generated = generateLocalPlayerIronicRoasts(playerHistories);
      setRoasts(generated);
      if (!selectedPlayerName || !playerHistories.some(p => p.name === selectedPlayerName)) {
        setSelectedPlayerName(playerHistories[0].name);
      }
    }
  }, [playerHistories]);

  const handleFetchAIRoasts = async () => {
    if (playerHistories.length === 0) return;
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/ironic-roasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerHistories })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRoasts(data);
          return;
        }
      }
      setRoasts(generateLocalPlayerIronicRoasts(playerHistories));
    } catch (e) {
      console.warn('Fallback to local ironic engine:', e);
      setRoasts(generateLocalPlayerIronicRoasts(playerHistories));
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleCopyRoast = (roast: PlayerIronicRoast) => {
    const text = `😂 *FICHA CÓMICA & MODO GUASA: ${roast.name.toUpperCase()}* 😂\n` +
      `🎭 *Arquetipo:* ${roast.comicArchetype}\n` +
      `🏆 *Premio Oficial:* ${roast.absurdAward}\n\n` +
      `🗣️ *Excusa Célebre:* ${roast.signatureExcuse}\n\n` +
      `📜 *Crónica del Partido:* ${roast.roastSummary}\n\n` +
      `⚠️ *Peligro en Cristales:* ${roast.dangerLevelOnGlass}\n` +
      `🍺 *Ritual del 3er Tiempo:* ${roast.postMatchRitual}\n\n` +
      `💡 *Consejo Irónico:* ${roast.ironicTip}\n\n` +
      `🎾 ¡Nos vemos en las cañas post-partido!`;

    navigator.clipboard.writeText(text);
    setCopiedRoast(roast.name);
    setTimeout(() => setCopiedRoast(null), 3000);
  };

  const activeRoast = roasts.find(r => r.name === selectedPlayerName) || roasts[0];
  const activeStats = playerHistories.find(p => p.name === selectedPlayerName);

  if (playerHistories.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-3">
        <Laugh className="w-10 h-10 mx-auto text-amber-500/50" />
        <h3 className="text-base font-bold text-white">Modo Guasa a la espera</h3>
        <p className="text-xs">Registra o finaliza partidos para que el club del humor analice las excusas y los tiros al cristal de cada jugador.</p>
      </div>
    );
  }

  return (
    <div id="ironic-roasts-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Laugh className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Modo Guasa & Crónicas Irónicas (El 3er Tiempo)
            </h2>
          </div>
          <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
            El análisis más honesto y cómico del grupo: las excusas más sonadas, los remates que aún buscan órbita, los inspectores de palas y los reyes indiscutibles de la cerveza post-partido.
          </p>
        </div>

        <button
          type="button"
          onClick={handleFetchAIRoasts}
          disabled={isLoadingAI}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
        >
          {isLoadingAI ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cocinando Guasa con IA...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Regenerar Modo Guasa IA</span>
            </>
          )}
        </button>
      </div>

      {/* Player Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {playerHistories.map(p => {
          const isSelected = p.name === selectedPlayerName;
          const pColor = getPlayerColor(p.name);
          const r = roasts.find(item => item.name === p.name);

          return (
            <button
              key={`roast-tab-${p.name}`}
              type="button"
              onClick={() => setSelectedPlayerName(p.name)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer border ${
                isSelected
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
              <span className="font-bold">{p.name}</span>
              <span className="text-[10px] bg-slate-800 text-amber-300/90 px-1.5 py-0.5 rounded font-mono font-bold">
                {r?.comicArchetype?.split(' ')[1] || 'Jugador'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Ironic Profile */}
      {activeRoast && (
        <div className="bg-slate-950 border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Header with Title & Absurd Award */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl shrink-0"
                style={{ backgroundColor: getPlayerColor(activeRoast.name) }}
              >
                😂
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-white">{activeRoast.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                    {activeRoast.comicArchetype}
                  </span>
                </div>
                <p className="text-xs text-amber-400/90 font-mono mt-1 font-semibold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  {activeRoast.absurdAward}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyRoast(activeRoast)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 self-start sm:self-center"
            >
              {copiedRoast === activeRoast.name ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Copiado para WhatsApp!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Guasa a WhatsApp</span>
                </>
              )}
            </button>
          </div>

          {/* Sarcastic Narrative Roast */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              La Crónica Incorruptible
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {activeRoast.roastSummary}
            </p>
          </div>

          {/* 3 Comedy Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Signature Excuse */}
            <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Excusa Oficial Favorita
              </div>
              <p className="text-xs text-slate-200 italic font-medium leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {activeRoast.signatureExcuse}
              </p>
            </div>

            {/* Danger to Club Facilities */}
            <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Peligro para los Cristales
              </div>
              <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {activeRoast.dangerLevelOnGlass}
              </p>
            </div>

            {/* 3rd Half Ritual */}
            <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Beer className="w-3.5 h-3.5" />
                Ritual del Tercer Tiempo
              </div>
              <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {activeRoast.postMatchRitual}
              </p>
            </div>
          </div>

          {/* Ironic Coach Tip */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
              💡
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Consejo Irónico del Entrenador:
              </div>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {activeRoast.ironicTip}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Group Banter Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
        {roasts.map((r, i) => (
          <div 
            key={`mini-roast-${r.name}`}
            onClick={() => setSelectedPlayerName(r.name)}
            className="bg-slate-900/80 hover:bg-slate-850 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition cursor-pointer space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">{r.name}</span>
              <span className="text-base">🎾</span>
            </div>
            <div className="text-[11px] text-amber-400 font-semibold truncate">
              {r.comicArchetype}
            </div>
            <p className="text-[11px] text-slate-400 italic line-clamp-2">
              {r.signatureExcuse}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
