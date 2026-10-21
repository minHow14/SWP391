// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/aiApi.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createSseParser } from '../src/services/aiApi.js';
import {
  ageFromDob, bmiCategory, buildMealPlanRequest, calcBmi, chatHistory, formatBmi, dietTypeToAi, formatDistance,
  friendlyAiError, genderToAi, goalToAi, mealPlanDefaults, planToMenuContext, stagePercent,
  validateMealPlanValues, MAX_MENU_CONTEXT,
} from '../src/utils/aiHelpers.js';

const originals = Object.fromEntries(['sessionStorage', 'localStorage', 'fetch'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
afterEach(() => {
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

test('SSE parser handles CRLF, split chunks, comments and multi-line data', () => {
  const events = [];
  const parser = createSseParser((name, payload) => events.push([name, payload]));
  parser.push('event: token\r\ndata: {"token": "Đậu "}\r\n\r\nevent: tok');
  parser.push('en\r\ndata: {"token": "hũ"}\r\n\r\n: ping\r\n\r\n');
  parser.push('event: done\ndata: {"status":"completed","remaining_questions":2}\n\n');
  parser.push('event: note\ndata: dòng 1\ndata: dòng 2\n\n');
  parser.end();
  assert.deepEqual(events, [
    ['token', { token: 'Đậu ' }],
    ['token', { token: 'hũ' }],
    ['done', { status: 'completed', remaining_questions: 2 }],
    ['note', 'dòng 1\ndòng 2'],
  ]);
});

test('SSE parser flushes a final event that lacks the blank line', () => {
  const events = [];
  const parser = createSseParser((name, payload) => events.push([name, payload]));
  parser.push('event: done\ndata: {"ok":true}');
  assert.equal(events.length, 0);
  parser.end();
  assert.deepEqual(events, [['done', { ok: true }]]);
});

test('streamChat sends identity headers, joins tokens and returns the remaining quota', async () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: () => JSON.stringify({ token: 'jwt-123', user: { user_id: 1 } }) } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'guest-xyz', setItem() {} } });
  const { streamChat } = await import('../src/services/aiApi.js?stream');
  let seen;
  globalThis.fetch = async (url, options) => {
    seen = { url, options };
    const body = 'event: token\r\ndata: {"token":"Xin "}\r\n\r\nevent: token\r\ndata: {"token":"chào"}\r\n\r\nevent: done\r\ndata: {"status":"completed","remaining_questions":1}\r\n\r\n';
    return new Response(body, { headers: { 'content-type': 'text/event-stream; charset=utf-8' } });
  };
  const tokens = [];
  const result = await streamChat({ message: 'hi', history: [{ role: 'user', content: 'a' }], dietaryType: 'vegan', onToken: (token) => tokens.push(token) });
  assert.equal(tokens.join(''), 'Xin chào');
  assert.equal(result.remaining, 1);
  assert.match(seen.url, /\/chat\/stream$/);
  assert.equal(seen.options.headers.Authorization, 'Bearer jwt-123');
  assert.equal(seen.options.headers['X-Guest-Id'], 'guest-xyz');
  assert.deepEqual(JSON.parse(seen.options.body), { message: 'hi', history: [{ role: 'user', content: 'a' }], dietary_type: 'vegan' });
});

test('streamChat turns an error event or an HTTP error envelope into AiApiError', async () => {
  const { streamChat, AiApiError } = await import('../src/services/aiApi.js?errors');
  globalThis.fetch = async () => new Response('event: error\ndata: {"success":false,"error":{"code":"AI_PROVIDER_ERROR","message":"bận"},"meta":{"requestId":"req_1"}}\n\n', { headers: { 'content-type': 'text/event-stream' } });
  await assert.rejects(streamChat({ message: 'x' }), (error) => error instanceof AiApiError && error.code === 'AI_PROVIDER_ERROR' && error.requestId === 'req_1');

  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: { code: 'CHAT_QUOTA_EXCEEDED', message: 'hết lượt', details: { resetAt: '2026-10-13T00:00:00+07:00' } }, meta: { requestId: 'req_2' } }), { status: 429 });
  await assert.rejects(streamChat({ message: 'x' }), (error) => error.status === 429 && error.code === 'CHAT_QUOTA_EXCEEDED' && error.details.resetAt.endsWith('+07:00'));

  globalThis.fetch = async () => { throw new TypeError('refused'); };
  await assert.rejects(streamChat({ message: 'x' }), (error) => error.code === 'NETWORK_ERROR' && error.cause instanceof TypeError);
});

test('streamMealPlan reports progress and returns the final plan', async () => {
  const { streamMealPlan } = await import('../src/services/aiApi.js?plan');
  globalThis.fetch = async () => new Response([
    'event: progress\ndata: {"success":true,"data":{"stage":"calculating","message":"A"}}\n\n',
    'event: progress\ndata: {"success":true,"data":{"stage":"generating","message":"B"}}\n\n',
    'event: done\ndata: {"success":true,"data":{"title":"Thực đơn","chat":{"items":[]}}}\n\n',
  ].join(''), { headers: { 'content-type': 'text/event-stream' } });
  const stages = [];
  const plan = await streamMealPlan({ request: { height_cm: 165 }, onProgress: (event) => stages.push(event.stage) });
  assert.deepEqual(stages, ['calculating', 'generating']);
  assert.equal(plan.title, 'Thực đơn');
});

test('profile data maps to the AI request fields', () => {
  assert.equal(dietTypeToAi(1), 'vegan');
  assert.equal(dietTypeToAi(2), 'lacto');
  assert.equal(dietTypeToAi(3), 'ovo');
  assert.equal(dietTypeToAi(4), 'lacto_ovo');
  assert.equal(dietTypeToAi(99), undefined);
  assert.deepEqual(['MALE', 'Nữ', 'Khác', ''].map(genderToAi), ['male', 'female', 'other', undefined]);
  assert.deepEqual(['Giảm cân', 'giảm mỡ', 'Tăng cơ', 'Theo dõi sức khỏe'].map(goalToAi), ['weight_loss', 'weight_loss', 'muscle_gain', 'maintenance']);
  assert.equal(ageFromDob('2000-03-12', new Date('2026-10-12T00:00:00Z')), 26);
  assert.equal(ageFromDob('2000-12-31', new Date('2026-10-12T00:00:00Z')), 25);
  assert.equal(ageFromDob('bad'), null);
});

test('BMI uses the Asian cut-offs shown by the AI service', () => {
  assert.equal(calcBmi(170, 65), 22.5);
  assert.equal(calcBmi('', 65), null);
  assert.deepEqual([18.4, 22.9, 23, 25].map(bmiCategory), ['Thiếu cân', 'Bình thường', 'Thừa cân', 'Béo phì']);
});

test('meal plan form is prefilled from the profile and builds a clean request', () => {
  const user = { health_profile: { height: 165, weight: 60, dob: '2000-01-01', gender: 'FEMALE', health_goal: 'Giảm cân', diet_type_id: 1 }, allergies: [{ ingredient_id: 5 }, { ingredient_id: 9 }] };
  const values = mealPlanDefaults({ user, ingredients: [{ ingredient_id: 5, name: 'Đậu phộng' }, { ingredient_id: 9, name: 'Nấm' }], dietTypeId: 4 });
  assert.equal(values.gender, 'female');
  assert.equal(values.goal, 'weight_loss');
  assert.equal(values.dietary_type, 'vegan'); // hồ sơ ưu tiên hơn chế độ đang chọn
  assert.deepEqual(values.allergies, ['Đậu phộng', 'Nấm']);
  const request = buildMealPlanRequest({ ...values, available_ingredients: [] });
  assert.equal(request.bmi, 22);
  assert.equal(request.height_cm, 165);
  assert.ok(!('available_ingredients' in request));
  assert.deepEqual(validateMealPlanValues(values), {});
  assert.deepEqual(Object.keys(validateMealPlanValues({ ...values, height_cm: 10, weight_kg: '', days: 9 })).sort(), ['days', 'height_cm', 'weight_kg']);
});

test('guest without a profile falls back to the chosen diet', () => {
  const values = mealPlanDefaults({ user: null, dietTypeId: 3 });
  assert.equal(values.dietary_type, 'ovo');
  assert.equal(values.height_cm, '');
});

const meal = (name) => ({ name, estimated_calories: 400, protein_g: 20, ingredients: ['Đậu phụ 100g', 'Cà chua', 'Gạo lứt', 'Rau', 'Nấm', 'Hành'] });
const day = (label) => ({ day: label, breakfast: meal('Cháo'), lunch: meal('Cơm'), dinner: meal('Canh'), snacks: null });

test('menu context stays under the API limit even for a long plan', () => {
  const plan = { title: 'Thực đơn', profile_summary: { target_daily_calories: 1572, bmi: 22, bmi_category: 'Bình thường', dietary_type: 'vegan' }, weekly_plan: Array.from({ length: 7 }, (_, i) => day(`Ngày ${i + 1}`)) };
  const text = planToMenuContext(plan);
  assert.ok(text.length < MAX_MENU_CONTEXT);
  assert.ok(text.includes('Ngày 7') && text.includes('1572 kcal'));
  const huge = { ...plan, weekly_plan: Array.from({ length: 7 }, (_, i) => ({ ...day(`Ngày ${i + 1}`), breakfast: meal('x'.repeat(900)), lunch: meal('y'.repeat(900)) })) };
  assert.ok(planToMenuContext(huge).length <= MAX_MENU_CONTEXT);
});

test('chat history only keeps recent plain chat messages', () => {
  const messages = [
    { role: 'user', kind: 'chat', text: 'q1' },
    { role: 'assistant', kind: 'chat', text: 'a1' },
    { role: 'assistant', kind: 'demo', text: 'demo' },
    { role: 'assistant', kind: 'chat', text: 'lỗi', error: true },
    { role: 'assistant', kind: 'chat', text: '...', pending: true },
    ...Array.from({ length: 12 }, (_, i) => ({ role: 'user', kind: 'chat', text: `m${i}` })),
  ];
  const history = chatHistory(messages);
  assert.equal(history.length, 10);
  assert.deepEqual(history.at(-1), { role: 'user', content: 'm11' });
  assert.ok(history.every((item) => !['demo', 'lỗi', '...'].includes(item.content)));
});

test('error messages are friendly and include the reset time for quota errors', () => {
  const quota = friendlyAiError({ code: 'CHAT_QUOTA_EXCEEDED', details: { resetAt: '2026-10-13T00:00:00+07:00' } });
  assert.match(quota, /hết lượt/);
  assert.match(quota, /00:00.*13.10/);
  assert.match(quota, /Đăng nhập/);
  assert.match(friendlyAiError({ code: 'RATE_LIMIT_EXCEEDED' }), /quá nhanh/);
  assert.match(friendlyAiError({ code: 'AI_PROVIDER_ERROR' }), /bận/);
  assert.match(friendlyAiError({ code: 'NETWORK_ERROR' }), /kết nối/);
  assert.match(friendlyAiError({ code: 'INVALID_INPUT', details: [{ msg: 'quá ngắn' }] }), /quá ngắn/);
  assert.equal(friendlyAiError({ code: 'X', message: 'tuỳ chỉnh' }), 'tuỳ chỉnh');
});

test('progress and distance helpers', () => {
  assert.ok(stagePercent('validating') > stagePercent('generating'));
  assert.ok(stagePercent('retrying') < stagePercent('validating'));
  assert.equal(formatDistance(420), '420 m');
  assert.equal(formatDistance(1440), '1,4 km');
  assert.equal(formatDistance(null), '');
});

test('BMI is shown with one decimal in Vietnamese style', () => {
  assert.equal(formatBmi(22), '22,0');
  assert.equal(formatBmi(22.54), '22,5');
  assert.equal(formatBmi(null), '');
});
