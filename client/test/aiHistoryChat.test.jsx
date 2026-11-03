// D:/SWP391/SWP391/client/test/aiHistoryChat.test.jsx
import { useState } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseContext } from '../src/context/databaseContext.js';
import { useChatBox } from '../src/features/chat/hooks/useChatBox.js';
import * as aiApi from '../src/services/aiApi.js';
import { videoRecipeSummaryApi } from '../src/services/videoRecipeSummaryApi.js';
import { setSession } from '../src/utils/session.js';

beforeEach(() => {
  setSession({ token: 'member', user: { user_id: 7 } });
  vi.spyOn(aiApi, 'getChatUsage').mockResolvedValue({ unlimited: true });
  vi.spyOn(videoRecipeSummaryApi, 'list').mockResolvedValue([]);
});
afterEach(() => { cleanup(); setSession(null); });

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

describe('opening saved conversations', () => {
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

  it('does not erase a streamed answer when an older conversation is opened', async () => {
    let finish;
    vi.spyOn(aiApi, 'streamChat').mockImplementation(({ onToken }) => { onToken('Đang trả lời'); return new Promise((resolve) => { finish = resolve; }); });
    const { result } = harness();
    act(() => { void result.current.ask('Câu hỏi mới'); });
    act(() => result.current.restoreHistory({ id: 'older', type: 'CHAT', status: 'COMPLETED', requestPayload: { message: 'Câu cũ' }, responsePayload: { reply: 'Đáp cũ' } }));
    await act(async () => finish({ remaining: null }));
    expect(result.current.messages.find((message) => message.text === 'Đang trả lời')).toMatchObject({ pending: false });
    expect(result.current.messages.some((message) => message.text === 'Đáp cũ')).toBe(true);
  });

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
