// D:/SWP391/SWP391/client/test/aiHistoryChat.test.jsx
// Kiểm thử việc mở lại hội thoại đã lưu trong hook useChatBox và việc hủy công việc của tài khoản cũ khi đổi tài khoản.
import { useState } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseContext } from '../src/context/databaseContext.js';
import { useChatBox } from '../src/features/chat/hooks/useChatBox.js';
import * as aiApi from '../src/services/aiApi.js';
import { videoRecipeSummaryApi } from '../src/services/videoRecipeSummaryApi.js';
import { setSession } from '../src/utils/session.js';

// Mỗi test bắt đầu với một thành viên đã đăng nhập; mock usage và danh sách tóm tắt video để hook không gọi API thật.
beforeEach(() => {
  setSession({ token: 'member', user: { user_id: 7 } });
  vi.spyOn(aiApi, 'getChatUsage').mockResolvedValue({ unlimited: true });
  vi.spyOn(videoRecipeSummaryApi, 'list').mockResolvedValue([]);
});
afterEach(() => { cleanup(); setSession(null); });

// Tạo hook useChatBox bọc trong DatabaseContext có thể đổi người dùng, nhằm mô phỏng đăng xuất/đổi tài khoản giữa chừng.
function harness() {
  let changeOwner;
  function Wrapper({ children }) {
    const [user, setUser] = useState({ user_id: 7 });
    changeOwner = setUser;
    return <DatabaseContext.Provider value={{ data: {}, user }}>{children}</DatabaseContext.Provider>;
  }
  const hook = renderHook(() => useChatBox({ dietTypeId: 1 }), { wrapper: Wrapper });
  return { ...hook, changeOwner: (user) => act(() => { setSession(user && { token: 'other', user }); changeOwner(user); }) };
}

// Nhóm test mở lại các hội thoại đã lưu.
describe('opening saved conversations', () => {
  // Khôi phục câu hỏi, câu trả lời và thẻ thực đơn đúng một lần (không trùng lặp) và vẫn giữ lời chào đầu tiên.
  it('restores questions, replies and meal plan cards once while preserving the greeting', () => {
    const { result } = harness();
    const chat = { id: 'saved-chat', type: 'CHAT', status: 'COMPLETED', requestPayload: { message: 'Hỏi về đậu' }, responsePayload: { reply: 'Đậu có đạm.' } };
    const plan = { title: 'Thực đơn đã tạo', weeklyPlan: [{ day: 'Thứ hai' }], chat: { text: 'Thực đơn của bạn' } };
    act(() => { result.current.restoreHistory(chat); result.current.restoreHistory(chat); result.current.restoreHistory({ id: 'saved-plan', type: 'MEAL_PLAN', status: 'COMPLETED', responsePayload: plan }); });
    expect(result.current.messages.map((message) => message.kind)).toEqual(['welcome', 'chat', 'chat', 'plan']);
    expect(result.current.messages[1].text).toBe('Hỏi về đậu');
    expect(result.current.messages[2].text).toBe('Đậu có đạm.');
    expect(result.current.messages[3].plan).toEqual({ ...plan, generationId: 'saved-plan' });
  });

  // Mở một hội thoại cũ trong lúc đang stream không được xóa câu trả lời đang được stream.
  it('does not erase a streamed answer when an older conversation is opened', async () => {
    let finish;
    // Stream phát một token rồi treo để có thể mở hội thoại cũ khi stream chưa xong.
    vi.spyOn(aiApi, 'streamChat').mockImplementation(({ onToken }) => { onToken('Đang trả lời'); return new Promise((resolve) => { finish = resolve; }); });
    const { result } = harness();
    act(() => { void result.current.ask('Câu hỏi mới'); });
    act(() => result.current.restoreHistory({ id: 'older', type: 'CHAT', status: 'COMPLETED', requestPayload: { message: 'Câu cũ' }, responsePayload: { reply: 'Đáp cũ' } }));
    await act(async () => finish({ remaining: null }));
    expect(result.current.messages.find((message) => message.text === 'Đang trả lời')).toMatchObject({ pending: false });
    expect(result.current.messages.some((message) => message.text === 'Đáp cũ')).toBe(true);
  });

  // Đổi tài khoản phải hủy stream của tài khoản cũ và bỏ qua token/usage đến muộn, tránh hiển thị dữ liệu của người khác.
  it('aborts old account work and ignores late stream tokens and usage', async () => {
    let stream;
    let finish;
    vi.spyOn(aiApi, 'streamChat').mockImplementation((options) => { stream = options; return new Promise((resolve) => { finish = resolve; }); });
    const { result, changeOwner } = harness();
    act(() => { void result.current.ask('Dữ liệu riêng của tài khoản cũ'); });
    changeOwner({ user_id: 8 });
    expect(stream.signal.aborted).toBe(true);
    await act(async () => { stream.onToken('Nội dung tài khoản cũ'); finish({ remaining: 2 }); });
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.messages.map((message) => message.kind)).toEqual(['welcome']);
    expect(result.current.contextPlan).toBeNull();
  });
});
