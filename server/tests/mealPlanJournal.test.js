// D:/SWP391/SWP391/server/tests/mealPlanJournal.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

const WEEK_DATE = '2026-10-29';
const MONDAY = '2026-10-26';
const meal = (name, calories) => ({ name, estimatedCalories: calories, proteinG: 10, carbsG: 20, fatG: 5, ingredients: [], instructions: '' });
const weeklyPlan = Array.from({ length: 7 }, (_, index) => ({
  day: `Ngày ${index + 1}`, dayNumber: index + 1,
  breakfast: meal(`Sáng ${index + 1}`, 400), lunch: meal(`Trưa ${index + 1}`, 500),
  dinner: meal(`Tối ${index + 1}`, 450), snacks: index === 0 ? meal('Phụ 1', 150) : null,
}));
const payload = { title: 'Thực đơn kiểm thử', weeklyPlan, profileSummary: { targetDailyCalories: 1800 } };
let owner, stranger, token, generation;
const auth = (user) => ({ Authorization: `Bearer ${generateToken({ user_id: user.user_id, role: user.role })}` });
const apply = (body, user = owner) => request(app).post('/api/workspace/plan/apply-ai').set(auth(user)).send(body);

beforeAll(async () => {
  const account = (name) => ({ email: `meal-journal-${name}-${randomUUID()}@example.invalid`, full_name: name, password_hash: 'unused-test-hash' });
  owner = await prisma.user.create({ data: account('owner') });
  stranger = await prisma.user.create({ data: account('stranger') });
  token = auth(owner);
  generation = await prisma.aiGeneration.create({ data: { userId: owner.user_id, type: 'MEAL_PLAN', status: 'COMPLETED',
    modelName: 'test-model', requestPayload: {}, promptMessages: [], responsePayload: payload } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { user_id: { in: [owner.user_id, stranger.user_id] } } });
  await prisma.$disconnect();
});

describe('applying an AI meal plan to the journal', () => {
  it('stores every day and meal in the Monday-based week and exposes them through the journal', async () => {
    const response = await apply({ generationId: generation.id, date: WEEK_DATE });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ weekStart: MONDAY, appliedMeals: 22 });
    const journal = await request(app).get('/api/workspace/journal').set(token);
    expect(journal.body.data.customPlans[MONDAY]).toMatchObject({
      breakfast: { name: 'Sáng 1', calories: 400, protein: 10, carbs: 20, fat: 5 }, snack: { name: 'Phụ 1' } });
    expect(journal.body.data.customPlans['2026-11-01'].dinner.name).toBe('Tối 7');
    expect(journal.body.data.plans[MONDAY]).toBeUndefined();
  });

  it('replaces the previous meals of the same week instead of duplicating them', async () => {
    const response = await apply({ generationId: generation.id, date: MONDAY });
    expect(response.status).toBe(200);
    expect(await prisma.mealPlan.count({ where: { user_id: owner.user_id } })).toBe(1);
    expect(await prisma.mealPlanDetail.count({ where: { meal_plan: { user_id: owner.user_id } } })).toBe(22);
  });

  it('records the suggested meals of a day into the real diary exactly once', async () => {
    const recorded = await request(app).post('/api/workspace/plan/record').set(token).send({ date: MONDAY });
    expect(recorded.status).toBe(200);
    const diaries = await prisma.foodDiary.findMany({ where: { user_id: owner.user_id }, include: { nutrients: true }, orderBy: { diary_id: 'asc' } });
    expect(diaries.map((entry) => entry.custom_food_name).sort()).toEqual(['Phụ 1', 'Sáng 1', 'Trưa 1', 'Tối 1']);
    expect(diaries.find((entry) => entry.custom_food_name === 'Sáng 1')).toMatchObject({ recipe_id: null, calories: 400, nutrients: { protein: 10, carbs: 20, fat: 5 } });
    const again = await request(app).post('/api/workspace/plan/record').set(token).send({ date: MONDAY });
    expect(again.status).toBe(409);
  });

  it('rejects other accounts, unfinished or unknown generations and invalid input', async () => {
    expect((await apply({ generationId: generation.id, date: WEEK_DATE }, stranger)).status).toBe(404);
    expect((await apply({ generationId: randomUUID(), date: WEEK_DATE })).status).toBe(404);
    const failed = await prisma.aiGeneration.create({ data: { userId: owner.user_id, type: 'MEAL_PLAN', status: 'FAILED',
      modelName: 'test-model', requestPayload: {}, promptMessages: [] } });
    expect((await apply({ generationId: failed.id, date: WEEK_DATE })).status).toBe(404);
    expect((await apply({ generationId: 'not-a-uuid', date: WEEK_DATE })).status).toBe(400);
    expect((await apply({ generationId: generation.id, date: '2026-13-40' })).status).toBe(400);
    expect((await request(app).post('/api/workspace/plan/apply-ai').send({ generationId: generation.id, date: WEEK_DATE })).status).toBe(401);
  });
});
