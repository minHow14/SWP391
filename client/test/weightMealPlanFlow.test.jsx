// D:/SWP391/SWP391/client/test/weightMealPlanFlow.test.jsx
// Kiểm thử tích hợp: cân nặng ghi nhận hôm nay được cập nhật vào hồ sơ dùng chung, nhật ký và request thực đơn tuần gửi cho AI mà không cần tải lại trang.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DatabaseProvider } from '../src/context/DatabaseProvider.jsx';
import { useDatabase } from '../src/hooks/useDatabase.js';
import ProfileForm from '../src/features/profile/components/ProfileForm.jsx';
import Journal from '../src/pages/Journal.jsx';
import ChatBox from '../src/features/chat/components/ChatBox.jsx';
import { authService } from '../src/services/authService.js';
import { workspaceService } from '../src/services/workspaceService.js';
import { videoRecipeSummaryApi } from '../src/services/videoRecipeSummaryApi.js';
import { getSession, setSession } from '../src/utils/session.js';

// Các hằng số số đo dùng cho kịch bản; lưu lại showModal/close gốc của <dialog> để khôi phục sau test.
const ORIGINAL_WEIGHT = 60;
const NEW_WEIGHT = 65;
const HEIGHT = 165;
const CATALOG = { recipes: [], ingredients: [], diets: [] };
const ORIGINAL_SHOW_MODAL = HTMLDialogElement.prototype.showModal;
const ORIGINAL_CLOSE = HTMLDialogElement.prototype.close;
// Tạo hồ sơ người dùng với cân nặng truyền vào.
const userAt = (weight) => ({ user_id: 10, full_name: 'Người kiểm thử',
  health_profile: { height: HEIGHT, weight, diet_type_id: 1, health_goal: 'Duy trì' } });
// serverWeight giả lập cân nặng lưu trên server; submittedRequest là body gửi cho AI lập thực đơn.
let serverWeight;
let submittedRequest;

// Ghép hồ sơ, nhật ký và ChatBox trên cùng một màn hình để kiểm tra dữ liệu dùng chung giữa các phần.
function WeightFlow() {
  const { data, user } = useDatabase();
  if (!data) return null;
  return <>
    <section aria-label="Hồ sơ đang mở"><ProfileForm userId={user.user_id} catalog={data} /></section>
    <section aria-label="Nhật ký đang mở"><Journal /></section>
    <ChatBox dietTypeId={1} />
  </>;
}

// Chặn fetch đến AI: trả usage không giới hạn, ghi lại body request lập thực đơn, request khác thì báo lỗi.
async function interceptAi(url, options) {
  if (String(url).endsWith('/ai/chat/usage')) {
    return new Response(JSON.stringify({ success: true, data: { unlimited: true } }));
  }
  if (!String(url).endsWith('/ai/meal-planner/generate/stream')) throw new Error(`Unexpected request: ${url}`);
  submittedRequest = JSON.parse(options.body);
  // Dừng tại ranh giới truyền tải: test chỉ kiểm tra dữ liệu đầu vào mà không gọi mô hình AI thật.
  return new Response('event: error\ndata: {"errorCode":"AI_PROVIDER_ERROR","message":"Dừng tại ranh giới AI trong kiểm thử"}\n\n',
    { headers: { 'content-type': 'text/event-stream' } });
}

// Mọi API hồ sơ/nhật ký/lịch sử cân nặng đọc từ serverWeight để phản ánh lần ghi nhận mới nhất.
beforeEach(() => {
  serverWeight = ORIGINAL_WEIGHT;
  submittedRequest = null;
  setSession({ token: 'weight-flow-session', user: userAt(serverWeight) });
  vi.spyOn(workspaceService, 'getCatalog').mockResolvedValue(CATALOG);
  vi.spyOn(authService, 'getMe').mockImplementation(async () => ({ data: { user: userAt(serverWeight) } }));
  vi.spyOn(workspaceService, 'getJournal').mockImplementation(async () => ({ days: {}, plans: {},
    profile: { height: HEIGHT, weight: serverWeight, calorieGoal: 1800, goal: 'Duy trì' } }));
  vi.spyOn(authService, 'getHealthHistory').mockImplementation(async () => ({ data: { histories: [{
    history_id: 1, weight: serverWeight, bmi: Math.round(serverWeight / (HEIGHT / 100) ** 2 * 10) / 10,
    recorded_date: new Date().toISOString(),
  }] } }));
  vi.spyOn(authService, 'recordWeight').mockImplementation(async ({ weight }) => {
    serverWeight = weight;
    return { data: { record: { weight } } };
  });
  vi.spyOn(videoRecipeSummaryApi, 'list').mockResolvedValue([]);
  vi.stubGlobal('fetch', vi.fn(interceptAi));
  // jsdom chưa hỗ trợ showModal/close của <dialog> nên cần giả lập.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});

afterEach(() => {
  cleanup(); setSession(null); vi.restoreAllMocks(); vi.unstubAllGlobals();
  HTMLDialogElement.prototype.showModal = ORIGINAL_SHOW_MODAL;
  HTMLDialogElement.prototype.close = ORIGINAL_CLOSE;
});

// Render màn hình và chờ hồ sơ, nhật ký hiển thị cân nặng ban đầu.
async function mountFlow() {
  render(<MemoryRouter><DatabaseProvider><WeightFlow /></DatabaseProvider></MemoryRouter>);
  await screen.findByLabelText('Ghi nhận cân nặng hôm nay:');
  await within(screen.getByRole('region', { name: 'Nhật ký đang mở' })).findByText(`${ORIGINAL_WEIGHT} kg`);
}

// Ghi nhận cân nặng mới cho hôm nay và chờ thông báo thành công.
async function recordToday() {
  fireEvent.change(screen.getByLabelText('Ghi nhận cân nặng hôm nay:'), { target: { value: String(NEW_WEIGHT) } });
  fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
  await screen.findByText(`Đã ghi nhận ${NEW_WEIGHT} kg thành công!`);
  expect(authService.recordWeight).toHaveBeenCalledWith({ weight: NEW_WEIGHT });
}

// Kiểm tra phiên, form hồ sơ và nhật ký đều đã hiển thị cân nặng mới.
async function expectRefreshedProfile() {
  await waitFor(() => expect(getSession().user.health_profile.weight).toBe(NEW_WEIGHT));
  const profile = screen.getByRole('region', { name: 'Hồ sơ đang mở' });
  expect(Number(within(profile).getByLabelText('Cân nặng (kg)').value)).toBe(NEW_WEIGHT);
  await within(screen.getByRole('region', { name: 'Nhật ký đang mở' })).findByText(`${NEW_WEIGHT} kg`);
}

// Mở trợ lý tư vấn và chọn chức năng lập thực đơn tuần.
function openMealPlanner() {
  fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ Lý Tư Vấn' }));
  fireEvent.click(screen.getByRole('button', { name: 'Thực đơn tuần' }));
}

// Bấm tạo thực đơn và kiểm tra request gửi AI dùng cân nặng mới cùng BMI tính lại.
async function expectNewWeightInRequest() {
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(submittedRequest).not.toBeNull());
  expect(submittedRequest).toMatchObject({ heightCm: HEIGHT, weightKg: NEW_WEIGHT, days: 7,
    bmi: 23.9 });
}

// Cân nặng ghi nhận hôm nay phải được dùng ngay trong hồ sơ, nhật ký và request thực đơn tuần mà không cần tải lại trang.
it('uses today’s recorded weight in the shared profile, journal and weekly AI request without reloading', async () => {
  await mountFlow();
  await recordToday();
  await expectRefreshedProfile();
  openMealPlanner();
  await expectNewWeightInRequest();
});

// Mục tiêu và số ngày người dùng tự nhập không bị ghi đè khi hồ sơ được làm mới.
it('preserves a manually entered goal and number of days while the profile refreshes', async () => {
  await mountFlow();
  let finishRefresh;
  // Giữ request làm mới hồ sơ ở trạng thái chờ để người dùng kịp sửa form trước khi nó hoàn tất.
  authService.getMe.mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve; }));
  await recordToday();
  openMealPlanner();
  fireEvent.change(screen.getByLabelText('Mục tiêu'), { target: { value: 'muscle_gain' } });
  fireEvent.change(screen.getByLabelText('Số ngày (1-7)'), { target: { value: '3' } });
  await act(async () => { finishRefresh({ data: { user: userAt(NEW_WEIGHT) } }); });
  await expectRefreshedProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(submittedRequest).not.toBeNull());
  expect(submittedRequest).toMatchObject({ weightKg: 65, bmi: 23.9, goal: 'muscle_gain', days: 3 });
});

// Cân nặng người dùng cố ý nhập tay trong form không bị ghi đè khi hồ sơ được làm mới.
it('preserves a deliberate weight override when the saved profile refreshes', async () => {
  await mountFlow();
  let finishRefresh;
  authService.getMe.mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve; }));
  await recordToday();
  openMealPlanner();
  const dialog = screen.getByRole('dialog', { name: 'Thực đơn chay theo BMI' });
  fireEvent.change(within(dialog).getByLabelText('Cân nặng (kg)'), { target: { value: '70' } });
  await act(async () => { finishRefresh({ data: { user: userAt(NEW_WEIGHT) } }); });
  await expectRefreshedProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(submittedRequest).not.toBeNull());
  expect(submittedRequest).toMatchObject({ weightKg: 70, bmi: 25.7 });
});

// Mở hộp thoại khi việc làm mới hồ sơ còn đang chờ vẫn phải dùng cân nặng mới sau khi làm mới xong.
it('uses the refreshed weight when the weekly dialog opens while the profile refresh is still pending', async () => {
  await mountFlow();
  let finishRefresh;
  authService.getMe.mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve; }));
  await recordToday();
  openMealPlanner();
  await act(async () => { finishRefresh({ data: { user: userAt(NEW_WEIGHT) } }); });
  await expectRefreshedProfile();
  await expectNewWeightInRequest();
});
