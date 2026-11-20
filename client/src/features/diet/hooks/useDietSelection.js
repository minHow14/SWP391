// D:/SWP391/SWP391/client/src/features/diet/hooks/useDietSelection.js
// Hook quản lý chế độ ăn hiện tại: người dùng đăng nhập lưu vào hồ sơ trên server, khách lưu trong sessionStorage.
import { useState } from 'react';
import { useDatabase } from '../../../hooks/useDatabase.js';
import { authService } from '../../../services/authService.js';
import { getSession, getSessionSnapshot, setSession } from '../../../utils/session.js';
import { getSavedDiet, saveDiet } from '../../../utils/dietSelection.js';
import { emitSyncEvent } from '../../../utils/syncEvents.js';

// Lưu chế độ ăn vào hồ sơ tài khoản; trả false nếu danh tính đã đổi trong lúc chờ,
// ném lỗi nếu server không xác nhận đúng giá trị đã lưu, thành công thì cập nhật phiên và báo đồng bộ.
async function persistAccountDiet(selection, snapshot) {
  const result = await authService.updateMe({ health_profile: { diet_type_id: selection.diet_type_id } });
  if (getSessionSnapshot().identityRevision !== snapshot.identityRevision) return false;
  const user = result?.data?.user || result?.user;
  if (user?.user_id !== snapshot.userId || user.health_profile?.diet_type_id !== selection.diet_type_id) {
    throw new Error('Chưa xác nhận được kiểu ăn chay đã lưu. Vui lòng thử lại.');
  }
  setSession({ ...getSession(), user });
  emitSyncEvent('USER_CHANGED', { userId: user.user_id });
  return true;
}

// Hook trả về chế độ ăn hiện tại, hàm xác nhận và trạng thái mở hộp chọn.
export function useDietSelection(options) {
  const { user } = useDatabase();
  const [guestDiet, setGuestDiet] = useState(() => getSavedDiet(options));
  // Lưu identityRevision lúc mở hộp chọn để hộp tự đóng khi người dùng đổi tài khoản.
  const [pickerIdentity, setPickerIdentity] = useState(null);
  const snapshot = getSessionSnapshot();
  const diet = user ? options.find((item) => item.diet_type_id === user.health_profile?.diet_type_id) : guestDiet;

  // Xác nhận lựa chọn; bỏ qua nếu phiên đã đổi kể từ lúc render để không lưu nhầm tài khoản.
  async function confirm(selection) {
    if ((user?.user_id ?? null) !== snapshot.userId || getSessionSnapshot().identityRevision !== snapshot.identityRevision) return false;
    if (user && !await persistAccountDiet(selection, snapshot)) return false;
    if (!user) {
      saveDiet(selection, options);
      setGuestDiet(selection);
    }
    setPickerIdentity(null);
    return true;
  }

  return { diet, confirm, identityRevision: snapshot.identityRevision,
    pickerOpen: pickerIdentity === snapshot.identityRevision,
    openPicker: () => setPickerIdentity(snapshot.identityRevision) };
}
