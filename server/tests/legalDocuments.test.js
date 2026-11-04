// D:/SWP391/SWP391/server/tests/legalDocuments.test.js
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';

const SLUG = 'privacy-policy';
let admin;
let member;
const auth = (user) => ({ Authorization: `Bearer ${generateToken({ user_id: user.user_id, role: user.role })}` });
const write = (body, user = admin) => request(app).put(`/api/v1/admin/legal-documents/${SLUG}`).set(auth(user)).send(body);

beforeAll(async () => {
  const account = (role) => prisma.user.create({ data: {
    email: `legal-document-${randomUUID()}@example.invalid`, full_name: 'Legal document regression', password_hash: 'unused-test-hash', role,
  } });
  admin = await account(1);
  member = await account(2);
  if (prisma.legalDocument) await prisma.legalDocument.deleteMany({ where: { slug: SLUG } });
});
afterAll(async () => {
  if (prisma.legalDocument) await prisma.legalDocument.deleteMany({ where: { slug: SLUG } });
  await prisma.user.deleteMany({ where: { user_id: { in: [admin?.user_id, member?.user_id].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe('admin-authored legal documents', () => {
  it('does not expose an unpublished document or fabricate default content', async () => {
    const response = await request(app).get(`/api/v1/legal-documents/${SLUG}`);
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('stores an admin draft, exposes it only to admins, then publishes actual saved content', async () => {
    const body = { title: 'Privacy policy under review', content: 'Content authored by the administrator during this regression.', published: false };
    const draft = await write(body);
    expect(draft.status).toBe(200);
    expect(draft.body.data).toMatchObject({ ...body, version: 1 });
    expect((await request(app).get(`/api/v1/legal-documents/${SLUG}`)).status).toBe(404);
    const inspection = await request(app).get(`/api/v1/admin/legal-documents/${SLUG}`).set(auth(admin));
    expect(inspection.status).toBe(200);
    expect(inspection.body.data.content).toBe(body.content);
    const published = await write({ ...body, published: true });
    expect(published.status).toBe(200);
    expect(published.body.data).toMatchObject({ ...body, published: true, version: 2 });
    const publicDocument = await request(app).get(`/api/v1/legal-documents/${SLUG}`);
    expect(publicDocument.status).toBe(200);
    expect(publicDocument.body.data.content).toBe(body.content);
  });

  it('requires admin permission to view drafts or modify legal content', async () => {
    expect((await write({ title: 'Denied', content: 'Unauthorized content', published: true }, member)).status).toBe(403);
    expect((await request(app).get(`/api/v1/admin/legal-documents/${SLUG}`).set(auth(member))).status).toBe(403);
    expect((await request(app).put(`/api/v1/admin/legal-documents/${SLUG}`).send({})).status).toBe(401);
  });

  it('rejects empty or unknown legal documents instead of publishing placeholder text', async () => {
    expect((await write({ title: ' ', content: ' ', published: true })).status).toBe(400);
    const unknown = await request(app).put('/api/v1/admin/legal-documents/unknown').set(auth(admin))
      .send({ title: 'Unknown', content: 'Unsupported document', published: true });
    expect(unknown.status).toBe(400);
  });
});
