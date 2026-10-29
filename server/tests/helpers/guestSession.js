// server/tests/helpers/guestSession.js
import assert from 'node:assert/strict';
import request from 'supertest';

export async function createGuestSession(app) {
  const agent = request.agent(app);
  const response = await agent.get('/api/ai/usage');
  assert.equal(response.status, 200);
  assert.match(response.body.data.guestId, /^guest:/);
  return { agent, guestId: response.body.data.guestId };
}
