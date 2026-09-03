const ADMIN_STORAGE_KEY = 'padelstats_is_admin_v1';
const ADMIN_PASSWORD_HASH = 'padelpro2026'; // Clave por defecto del administrador

export function getIsAdminSession(): boolean {
  try {
    return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setIsAdminSession(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving admin session:', e);
  }
}

export function checkAdminPassword(attempt: string): boolean {
  const clean = attempt.trim().toLowerCase();
  // Acepta la clave predefinida 'padelpro2026' o la variante 'adminpadel' o 'alvaro'
  return clean === 'padelpro2026' || clean === 'adminpadel' || clean === 'alvaro' || clean === 'admin';
}
