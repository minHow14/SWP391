// D:/SWP391/SWP391/client/src/utils/session.js
// Quản lý phiên đăng nhập phía client: lưu trong sessionStorage hoặc localStorage (khi "ghi nhớ"),
// có bản sao trong bộ nhớ và các bộ đếm revision để phát hiện phiên thay đổi giữa chừng.
const SESSION_KEY = 'chayxanh-session';
// memorySession là nguồn sự thật trong tab; revision tăng mỗi lần ghi phiên,
// identityRevision chỉ tăng khi danh tính đổi (đăng nhập/đăng xuất/đổi tài khoản).
let memorySession;
let rememberSession = false;
let revision = 0;
let identityRevision = 0;

// Đọc phiên đã lưu từ storage; trả null nếu không có hoặc storage bị chặn/dữ liệu hỏng.
function readStoredSession(storageName) {
  try { return JSON.parse(globalThis[storageName]?.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

// Lấy phiên hiện tại: ưu tiên bộ nhớ, rồi phiên của tab, cuối cùng là phiên được ghi nhớ lâu dài.
export function getSession() {
  if (memorySession !== undefined) return memorySession;
  const tabSession = readStoredSession('sessionStorage');
  if (tabSession) return tabSession;
  const persistentSession = readStoredSession('localStorage');
  rememberSession = Boolean(persistentSession);
  return persistentSession;
}

// Ảnh chụp trạng thái phiên để so sánh sau các thao tác bất đồng bộ.
export function getSessionSnapshot() {
  const session = getSession();
  return { token: session?.token || null, userId: session?.user?.user_id || null, revision, identityRevision };
}

// Ghi hoặc xóa phiên trong một loại storage.
function writeStorage(storageName, value) {
  try {
    if (value) globalThis[storageName]?.setItem(SESSION_KEY, JSON.stringify(value));
    else globalThis[storageName]?.removeItem(SESSION_KEY);
  } catch { /* Vẫn giữ đăng nhập hoạt động trong bộ nhớ khi trình duyệt chặn storage. */ }
}

// Cập nhật phiên (null để đăng xuất), ghi vào đúng storage theo lựa chọn ghi nhớ và phát sự kiện chayxanh-session.
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
