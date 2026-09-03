import React, { useState } from 'react';
import { Sparkles, Trophy, Flame, Target, Users, Loader2, RefreshCw } from 'lucide-react';
import { PlayerHistorySummary } from '../types';
import { generateLocalTacticalInsights, TacticalInsightsResult } from '../utils/statsCalculator';

interface GroupTacticalInsightsProps {
  playerHistories: PlayerHistorySummary[];
}

export const GroupTacticalInsights: React.FC<GroupTacticalInsightsProps> = ({ playerHistories }) => {
  const [insights, setInsights] = useState<TacticalInsightsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (!playerHistories || playerHistories.length === 0) {
      setError('Aún no hay partidos guardados en el historial. Registra o anota al menos un partido para generar el informe táctico.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/group-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerHistories })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.groupHeadline && data.awards) {
          setInsights(data);
          return;
        }
      }

      // Fallback to high-precision local statistical analytics
      const fallback = generateLocalTacticalInsights(playerHistories);
      setInsights(fallback);
    } catch (err: any) {
      console.warn('Network or server error during tactical insights fetch, using local engine:', err);
      const fallback = generateLocalTacticalInsights(playerHistories);
      setInsights(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-coaching-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Informe del Entrenador IA
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Gemini Tactical AI
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Diagnóstico táctico del grupo de amigos y recomendaciones de parejas ideales.
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-generate-tactical-report"
          onClick={fetchInsights}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generando Diagnóstico...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              {insights ? 'Actualizar Informe IA' : 'Generar Informe Táctico con IA'}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {!insights && !isLoading && (
        <div className="mt-5 p-8 text-center bg-slate-950 rounded-xl border border-slate-800/80">
          <Sparkles className="w-8 h-8 text-emerald-400/50 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-200 mb-1">
            Análisis Global del Grupo con Inteligencia Artificial
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Pulsa el botón superior para que Gemini 3.7 Flash examine el historial completo de partidos, otorgue premios temáticos a cada amigo y sugiera parejas equilibradas.
          </p>
          <button
            type="button"
            onClick={fetchInsights}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
          >
            Generar Diagnóstico Ahora
          </button>
        </div>
      )}

      {insights && (
        <div className="mt-5 space-y-5">
          {/* Headline */}
          {insights.groupHeadline && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1">
                Conclusión del Entrenador
              </div>
              <div className="text-sm font-bold text-slate-100">{insights.groupHeadline}</div>
            </div>
          )}

          {/* Awards */}
          {insights.awards && insights.awards.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Premios y Menciones Especiales del Grupo:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.awards.map((award, idx) => (
                  <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-amber-300">{award.title}</span>
                      <span className="text-xs font-black text-white bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-700">
                        {award.winner}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{award.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tactical Summary */}
          {insights.tacticalSummary && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                Resumen Táctico Global
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">{insights.tacticalSummary}</p>
            </div>
          )}

          {/* Recommended Pairings */}
          {insights.recommendedPairings && insights.recommendedPairings.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Parejas Recomendadas para Partidos Igualados:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.recommendedPairings.map((pair, idx) => (
                  <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 mb-1">{pair.pair}</div>
                    <p className="text-xs text-slate-400">{pair.strategy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
