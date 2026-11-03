// D:/SWP391/SWP391/server/tests/journalProfileHistory.test.js
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { userRepository } from '../src/repositories/user.repository.js';

let member;
let authorization;
const saveJournalProfile = (overrides = {}) => request(app).patch('/api/workspace/profile')
  .set('Authorization', authorization).send({ height: 175, weight: 70, calorieGoal: 2000, goal: 'Duy trì', ...overrides });
const getHistory = () => request(app).get('/api/v1/auth/me/health-history').set('Authorization', authorization);

beforeEach(async () => {
  member = await prisma.user.create({ data: {
    email: `journal-history-${randomUUID()}@example.invalid`, full_name: 'Journal history regression', password_hash: 'unused-test-hash',
  } });
  authorization = `Bearer ${generateToken({ user_id: member.user_id, role: member.role })}`;
});
afterEach(async () => {
  vi.restoreAllMocks();
  if (member) await prisma.user.delete({ where: { user_id: member.user_id } });
});
afterAll(() => prisma.$disconnect());

describe('journal profile weight history', () => {
  it.each([10, 400])('records a profile weight of %s kg accepted by the profile endpoint', async (weight) => {
    expect((await saveJournalProfile({ weight })).status).toBe(200);
    const histories = (await getHistory()).body.data.histories;
    expect(histories).toHaveLength(1);
    expect(histories[0].weight).toBe(weight);
  });

  it('exposes the saved journal weight and calculated BMI in health history', async () => {
    expect((await saveJournalProfile()).status).toBe(200);
    const response = await getHistory();
    expect(response.status).toBe(200);
    expect(response.body.data.currentProfile).toMatchObject({ height: 175, weight: 70 });
    expect(response.body.data.histories).toHaveLength(1);
    expect(response.body.data.histories[0]).toMatchObject({ weight: 70, bmi: 22.9 });
    expect(Number.isNaN(Date.parse(response.body.data.histories[0].recorded_date))).toBe(false);
  });

  it('records a changed weight without duplicating an unchanged decimal weight', async () => {
    expect((await saveJournalProfile({ weight: 62.7 })).status).toBe(200);
    expect((await saveJournalProfile({ weight: 62.7, calorieGoal: 2100 })).status).toBe(200);
    expect((await getHistory()).body.data.histories).toHaveLength(1);
    expect((await saveJournalProfile({ weight: 72, height: 180 })).status).toBe(200);
    const histories = (await getHistory()).body.data.histories;
    expect(histories).toHaveLength(2);
    expect(histories[0]).toMatchObject({ weight: 72, bmi: 22.2 });
  });

  it('compares persisted precision when saving the same fractional measurements twice', async () => {
    const measurements = { weight: 62.7123456789, height: 175.123456789 };
    expect((await saveJournalProfile(measurements)).status).toBe(200);
    expect((await saveJournalProfile(measurements)).status).toBe(200);
    const response = await getHistory();
    expect(response.body.data.histories).toHaveLength(1);
    expect(response.body.data.histories[0].weight).toBe(response.body.data.currentProfile.weight);
  });

  it('does not duplicate a journal weight when another measurement has a future recorded date', async () => {
    expect((await saveJournalProfile()).status).toBe(200);
    const future = await request(app).post('/api/v1/auth/me/weight').set('Authorization', authorization)
      .send({ weight: 80, recordedDate: '2099-01-01T00:00:00.000Z' });
    expect(future.status).toBe(201);
    expect((await saveJournalProfile()).status).toBe(200);
    expect((await saveJournalProfile({ calorieGoal: 2100 })).status).toBe(200);
    const histories = (await getHistory()).body.data.histories;
    expect(histories).toHaveLength(3);
    expect(histories[0].weight).toBe(80);
    expect(histories.filter((history) => history.weight === 70)).toHaveLength(2);
  });

  it('shares history with the auth profile endpoint and does not record a cleared weight', async () => {
    const updateAuth = (health_profile) => request(app).patch('/api/v1/auth/me')
      .set('Authorization', authorization).send({ health_profile });
    expect((await updateAuth({ height: 175, weight: 70 })).status).toBe(200);
    expect((await saveJournalProfile()).status).toBe(200);
    expect((await getHistory()).body.data.histories).toHaveLength(1);
    expect((await updateAuth({ weight: null })).status).toBe(200);
    const response = await getHistory();
    expect(response.body.data.currentProfile.weight).toBeNull();
    expect(response.body.data.histories).toHaveLength(1);
  });

  it('rolls profile and calorie preferences back when weight-history persistence fails', async () => {
    expect((await saveJournalProfile()).status).toBe(200);
    vi.spyOn(userRepository, 'addHealthHistory').mockRejectedValueOnce(new Error('Injected history persistence failure'));
    const response = await saveJournalProfile({ weight: 75, calorieGoal: 2300, goal: 'Tăng cơ' });
    expect(response.status).toBe(500);
    const history = (await getHistory()).body.data;
    expect(history.currentProfile).toMatchObject({ weight: 70, health_goal: 'Duy trì' });
    expect(history.histories).toHaveLength(1);
    const journal = await request(app).get('/api/workspace/journal').set('Authorization', authorization);
    expect(journal.body.data.profile).toMatchObject({ weight: 70, calorieGoal: 2000, goal: 'Duy trì' });
  });
});
