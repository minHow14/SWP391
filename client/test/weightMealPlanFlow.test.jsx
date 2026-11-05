// D:/SWP391/SWP391/client/test/weightMealPlanFlow.test.jsx
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

const ORIGINAL_WEIGHT = 60;
const NEW_WEIGHT = 65;
const HEIGHT = 165;
const CATALOG = { recipes: [], ingredients: [], diets: [] };
const ORIGINAL_SHOW_MODAL = HTMLDialogElement.prototype.showModal;
const ORIGINAL_CLOSE = HTMLDialogElement.prototype.close;
const userAt = (weight) => ({ user_id: 10, full_name: 'Người kiểm thử',
  health_profile: { height: HEIGHT, weight, diet_type_id: 1, health_goal: 'Duy trì' } });
let serverWeight;
let submittedRequest;

function WeightFlow() {
  const { data, user } = useDatabase();
  if (!data) return null;
  return <>
    <section aria-label="Hồ sơ đang mở"><ProfileForm userId={user.user_id} catalog={data} /></section>
    <section aria-label="Nhật ký đang mở"><Journal /></section>
    <ChatBox dietTypeId={1} />
  </>;
}

async function interceptAi(url, options) {
  if (String(url).endsWith('/ai/chat/usage')) {
    return new Response(JSON.stringify({ success: true, data: { unlimited: true } }));
  }
  if (!String(url).endsWith('/ai/meal-planner/generate/stream')) throw new Error(`Unexpected request: ${url}`);
  submittedRequest = JSON.parse(options.body);
  // End at the transport boundary: this test verifies inputs without calling a model.
  return new Response('event: error\ndata: {"errorCode":"AI_PROVIDER_ERROR","message":"Dừng tại ranh giới AI trong kiểm thử"}\n\n',
    { headers: { 'content-type': 'text/event-stream' } });
}

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
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});

afterEach(() => {
  cleanup(); setSession(null); vi.restoreAllMocks(); vi.unstubAllGlobals();
  HTMLDialogElement.prototype.showModal = ORIGINAL_SHOW_MODAL;
  HTMLDialogElement.prototype.close = ORIGINAL_CLOSE;
});

async function mountFlow() {
  render(<MemoryRouter><DatabaseProvider><WeightFlow /></DatabaseProvider></MemoryRouter>);
  await screen.findByLabelText('Ghi nhận cân nặng hôm nay:');
  await within(screen.getByRole('region', { name: 'Nhật ký đang mở' })).findByText(`${ORIGINAL_WEIGHT} kg`);
}

async function recordToday() {
  fireEvent.change(screen.getByLabelText('Ghi nhận cân nặng hôm nay:'), { target: { value: String(NEW_WEIGHT) } });
  fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));
  await screen.findByText(`Đã ghi nhận ${NEW_WEIGHT} kg thành công!`);
  expect(authService.recordWeight).toHaveBeenCalledWith({ weight: NEW_WEIGHT });
}

async function expectRefreshedProfile() {
  await waitFor(() => expect(getSession().user.health_profile.weight).toBe(NEW_WEIGHT));
  const profile = screen.getByRole('region', { name: 'Hồ sơ đang mở' });
  expect(Number(within(profile).getByLabelText('Cân nặng (kg)').value)).toBe(NEW_WEIGHT);
  await within(screen.getByRole('region', { name: 'Nhật ký đang mở' })).findByText(`${NEW_WEIGHT} kg`);
}

function openMealPlanner() {
  fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ Lý Tư Vấn' }));
  fireEvent.click(screen.getByRole('button', { name: 'Thực đơn tuần' }));
}

async function expectNewWeightInRequest() {
  fireEvent.click(screen.getByRole('button', { name: 'Tạo thực đơn' }));
  await waitFor(() => expect(submittedRequest).not.toBeNull());
  expect(submittedRequest).toMatchObject({ heightCm: HEIGHT, weightKg: NEW_WEIGHT, days: 7,
    bmi: 23.9 });
}

it('uses today’s recorded weight in the shared profile, journal and weekly AI request without reloading', async () => {
  await mountFlow();
  await recordToday();
  await expectRefreshedProfile();
  openMealPlanner();
  await expectNewWeightInRequest();
});

it('preserves a manually entered goal and number of days while the profile refreshes', async () => {
  await mountFlow();
  let finishRefresh;
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
