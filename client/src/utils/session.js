// D:/SWP391/SWP391/client/src/utils/session.js
const SESSION_KEY = 'chayxanh-session';
let memorySession;
let rememberSession = false;
let revision = 0;
let identityRevision = 0;

function readStoredSession(storageName) {
  try { return JSON.parse(globalThis[storageName]?.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

export function getSession() {
  if (memorySession !== undefined) return memorySession;
  const tabSession = readStoredSession('sessionStorage');
  if (tabSession) return tabSession;
  const persistentSession = readStoredSession('localStorage');
  rememberSession = Boolean(persistentSession);
  return persistentSession;
}

export function getSessionSnapshot() {
  const session = getSession();
  return { token: session?.token || null, userId: session?.user?.user_id || null, revision, identityRevision };
}

function writeStorage(storageName, value) {
  try {
    if (value) globalThis[storageName]?.setItem(SESSION_KEY, JSON.stringify(value));
    else globalThis[storageName]?.removeItem(SESSION_KEY);
  } catch { /* Keep authentication usable in memory when browser storage is blocked. */ }
}

export function setSession(value, { remember } = {}) {
  const previous = getSession();
  if (!value || remember !== undefined || previous?.user?.user_id !== value.user?.user_id) identityRevision += 1;
  if (remember !== undefined) rememberSession = Boolean(remember);
  if (!value) rememberSession = false;
  memorySession = value || null;
  revision += 1;
  writeStorage('sessionStorage', value && !rememberSession ? value : null);
  writeStorage('localStorage', value && rememberSession ? value : null);
  globalThis.window?.dispatchEvent(new Event('chayxanh-session'));
}
