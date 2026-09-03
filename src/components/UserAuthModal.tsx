import React, { useState } from 'react';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Sparkles, 
  LogIn, 
  UserCheck, 
  Eye, 
  Check, 
  Key, 
  AlertCircle,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { PlayerProfile } from '../types';
import { ActiveUserSession } from '../utils/playerProfilesStorage';
import { loginWithGoogle } from '../services/firebaseService';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: ActiveUserSession;
  playerProfiles: PlayerProfile[];
  onSelectPlayerSession: (session: ActiveUserSession) => void;
  onAdminLogin?: (pass: string) => boolean;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  playerProfiles,
  onSelectPlayerSession,
  onAdminLogin
}) => {
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(
    currentSession.playerName || 'Álvaro'
  );
  const [adminKey, setAdminKey] = useState<string>('');
  const [showAdminKeyInput, setShowAdminKeyInput] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsLoggingInGoogle(true);
    setErrorMsg(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        const userEmail = user.email || '';
        const displayName = user.displayName || '';
        const photoUrl = user.photoURL || undefined;

        // Check if user is Álvaro or matches one of the created players
        const isAlvaroAdmin = userEmail.toLowerCase() === 'alvarocalavia04@gmail.com' || displayName.toLowerCase().includes('alvaro') || displayName.toLowerCase().includes('álvaro');
        
        // Match player
        let matchedPlayer = playerProfiles.find(p => 
          displayName.toLowerCase().includes(p.name.toLowerCase()) || 
          userEmail.toLowerCase().includes(p.name.toLowerCase())
        );

        if (isAlvaroAdmin && !matchedPlayer) {
          matchedPlayer = playerProfiles.find(p => p.name.toLowerCase().includes('álvaro') || p.name.toLowerCase().includes('alvaro'));
        }

        const newSession: ActiveUserSession = {
          type: 'google',
          email: userEmail,
          displayName: displayName || matchedPlayer?.name || 'Jugador',
          photoUrl: photoUrl || matchedPlayer?.avatarUrl,
          playerName: matchedPlayer?.name || (isAlvaroAdmin ? 'Álvaro' : displayName.split(' ')[0]),
          isAdmin: isAlvaroAdmin
        };

        onSelectPlayerSession(newSession);
        onClose();
      }
    } catch (err: any) {
      console.warn('Google sign-in popup closed or restricted in iframe:', err);
      // Fallback: If in an iframe where popup is blocked, offer direct player selection
      setErrorMsg('No se pudo abrir la ventana de Google en este visor. Por favor, selecciona tu perfil directamente de la lista.');
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  // Handle Direct Player Identification
  const handleSelectPlayer = (profile: PlayerProfile) => {
    const isAlvaro = profile.name.toLowerCase().includes('álvaro') || profile.name.toLowerCase().includes('alvaro');
    
    const newSession: ActiveUserSession = {
      type: 'player',
      playerName: profile.name,
      displayName: profile.name,
      photoUrl: profile.avatarUrl,
      isAdmin: isAlvaro
    };

    onSelectPlayerSession(newSession);
    onClose();
  };

  // Handle Guest Access
  const handleGuestAccess = () => {
    const newSession: ActiveUserSession = {
      type: 'guest',
      playerName: undefined,
      displayName: 'Invitado',
      isAdmin: false
    };
    onSelectPlayerSession(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b101d] border border-slate-700/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <UserCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-tight">
                ¿Quién está jugando hoy?
              </h3>
              <p className="text-xs text-slate-400">
                Inicia sesión o selecciona tu jugador para ver tu perfil personalizado
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

        {/* Current status if active */}
        {currentSession.playerName && (
          <div className="mt-4 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-sm">
                {currentSession.playerName.charAt(0)}
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Identificado como:</span>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {currentSession.playerName}
                  {currentSession.isAdmin && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black rounded-md flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> ADMIN
                    </span>
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={handleGuestAccess}
              className="text-xs text-slate-400 hover:text-rose-400 font-medium transition flex items-center gap-1 px-2.5 py-1 bg-slate-800 rounded-lg hover:bg-slate-700"
            >
              <LogOut className="w-3 h-3" />
              <span>Cerrar</span>
            </button>
          </div>
        )}

        <div className="py-4 space-y-4">
          
          {/* Option 1: Google Sign In */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Opción 1: Iniciar sesión con Google</span>
            </h4>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Conéctate con tu cuenta de Google. Si eres Álvaro, te otorgará el rol de administrador exclusivo.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingInGoogle}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoggingInGoogle ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            </button>
            {errorMsg && (
              <p className="mt-2 text-[11px] text-amber-300 flex items-start gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Option 2: Direct Player Selector (Marcos, Mikel, Nico, Álvaro, Víctor) */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Opción 2: Selecciona tu jugador directo</span>
            </h4>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Elige tu nombre en el circuito para personalizar al instante tu pestaña <strong className="text-emerald-400">"Mi Perfil"</strong>:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {playerProfiles.map((p) => {
                const isSelected = currentSession.playerName?.toLowerCase() === p.name.toLowerCase();
                const isAlvaro = p.name.toLowerCase().includes('álvaro') || p.name.toLowerCase().includes('alvaro');

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPlayer(p)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col items-start gap-2 relative cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isAlvaro && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black rounded-md flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> ADMIN
                      </span>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-inner"
                          style={{ backgroundColor: p.avatarColor || '#10b981' }}
                        >
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span>{p.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[80px]">
                          {p.nickname || p.preferredSide}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option 3: Guest Mode */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-xs font-bold text-slate-200 block">Modo Invitado</span>
                <span className="text-[11px] text-slate-400">Ver partidos, rankings e historial sin identificarte</span>
              </div>
            </div>
            <button
              onClick={handleGuestAccess}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Entrar como Invitado
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer shadow-md shadow-emerald-500/20"
          >
            Listo / Continuar
          </button>
        </div>

      </div>
    </div>
  );
};
