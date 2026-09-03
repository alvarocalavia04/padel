import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Key, Lock, Unlock, LogOut, Check } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLoginAsAdmin: (password: string) => boolean;
  onLogoutAdmin: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLoginAsAdmin,
  onLogoutAdmin
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = onLoginAsAdmin(password);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPassword('');
        onClose();
      }, 1000);
    } else {
      setError('Contraseña incorrecta. Solo el administrador principal puede editar o registrar partidos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e1424] border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isAdmin ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isAdmin ? 'Modo Administrador Activo' : 'Acceso de Administrador'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAdmin ? 'Tienes permisos totales de edición y registro' : 'Protección de datos del circuito'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {isAdmin ? (
          <div className="py-6 space-y-4">
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200/90 leading-relaxed">
                <strong className="text-emerald-300 font-bold block mb-0.5">Eres el único Administrador:</strong>
                Puedes añadir partidos, editar estadísticas, cambiar fotos de grupo y eliminar jugadores. Los cambios se sincronizan en tiempo real para todos tus amigos.
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogoutAdmin();
                  onClose();
                }}
                className="px-4 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir de Modo Admin</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-6 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Tus amigos pueden entrar a la web y consultar libremente todas las estadísticas, gráficos y rankings. Para crear partidos o modificar información, introduce la clave de administrador.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Clave de Administrador
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce la contraseña..."
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none pr-10"
                />
                <Key className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              </div>
              {error && (
                <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
              {success && (
                <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  ¡Contraseña correcta! Modo Admin activado.
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Unlock className="w-4 h-4 stroke-[2.5]" />
                <span>Desbloquear Admin</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
