// D:/SWP391/SWP391/client/src/utils/session.js
let memorySession;
let revision = 0;
export function getSession() {
  if (memorySession !== undefined) return memorySession;
  try { return JSON.parse(sessionStorage.getItem('chayxanh-session')) || null; }
  catch { return null; }
}
export function getSessionSnapshot() {
  return { token: getSession()?.token || null, revision };
}
export function setSession(value) {
  memorySession = value || null;
  revision += 1;
  try {
    if (value) sessionStorage.setItem('chayxanh-session', JSON.stringify(value));
    else sessionStorage.removeItem('chayxanh-session');
  } catch { /* Keep the session in memory when browser storage is blocked. */ }
  globalThis.window?.dispatchEvent(new Event('chayxanh-session'));
}
