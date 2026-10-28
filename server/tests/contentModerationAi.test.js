// D:/SWP391/SWP391/server/tests/contentModerationAi.test.js
import http from 'node:http';
import { once } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { createContentModerationAiService } from '../src/services/contentModerationAiService.js';

const config = { url: 'http://127.0.0.1:8000', internalApiKey: 'a'.repeat(32) };
const job = { id: '47d23bf9-5ed9-4e9d-a731-3ecfe77b6399', postId: 1, contentVersion: 2,
  title: 'Sườn chay', content: 'Sườn chay làm từ đậu nành và nấm.', userId: 19 };
const valid = { decision: 'ALLOW', reason: 'Mô tả món ăn từ thực vật.', categories: [], evidence: [], modelName: 'provider-model', policyVersion: '1' };
const response = (data = valid) => new Response(JSON.stringify({ success: true, message: 'Đã kiểm tra.', data }),
  { headers: { 'Content-Type': 'application/json' } });

describe('content moderation AI boundary', () => {
  it('authenticates to the internal endpoint and sends only the content snapshot', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response());
    const result = await createContentModerationAiService({ fetchImpl, config }).moderate({ job });
    expect(result).toEqual(valid);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8000/api/v1/content-moderations');
    expect(options.headers['X-Internal-Api-Key']).toBe(config.internalApiKey);
    expect(options.redirect).toBe('error');
    expect(JSON.parse(options.body)).toEqual({ jobId: job.id, contentType: 'POST', contentVersion: 2, title: job.title, content: job.content });
  });
  it('rejects a missing internal key without making a request', async () => {
    const fetchImpl = vi.fn();
    await expect(createContentModerationAiService({ fetchImpl, config: { ...config, internalApiKey: undefined } })
      .moderate({ job })).rejects.toHaveProperty('errorCode', 'AI_NOT_CONFIGURED');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it.each([
    { ...valid, decision: 'PUBLISH_ANYTHING' },
    { ...valid, decision: 'REVIEW', categories: ['SPAM'], evidence: ['Không nằm trong bài viết'] },
    { ...valid, decision: 'REVIEW' },
    { ...valid, modelName: '' },
    { ...valid, reason: 'a'.repeat(2001) },
  ])('rejects invalid or unsupported conclusions', async (data) => {
    const ai = createContentModerationAiService({ config, fetchImpl: async () => response(data) });
    await expect(ai.moderate({ job })).rejects.toHaveProperty('errorCode', 'MODERATION_AI_INVALID_OUTPUT');
  });
  it('accepts a review only with evidence present in the submitted text', async () => {
    const data = { ...valid, decision: 'REVIEW', categories: ['SPAM'], evidence: ['đậu nành'] };
    await expect(createContentModerationAiService({ config, fetchImpl: async () => response(data) }).moderate({ job })).resolves.toEqual(data);
  });
  it('bounds response bytes and rejects non-JSON responses', async () => {
    for (const body of [new Response('a'.repeat(32_769)), new Response('<html>Error</html>', { headers: { 'Content-Type': 'text/html' } })]) {
      await expect(createContentModerationAiService({ config, fetchImpl: async () => body }).moderate({ job }))
        .rejects.toHaveProperty('errorCode', 'MODERATION_AI_INVALID_OUTPUT');
    }
  });
  it('does not expose an upstream authentication error body', async () => {
    const ai = createContentModerationAiService({ config, fetchImpl: async () => new Response('upstream secret', { status: 401 }) });
    await expect(ai.moderate({ job })).rejects.toMatchObject({ errorCode: 'MODERATION_AI_AUTH_FAILED', retryable: false });
  });
  it('cancels a real stalled HTTP request at the configured deadline', async () => {
    const server = http.createServer(() => {});
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const ai = createContentModerationAiService({ config: { ...config, url: `http://127.0.0.1:${server.address().port}` }, timeoutMs: 50 });
    try { await expect(ai.moderate({ job })).rejects.toMatchObject({ errorCode: 'MODERATION_AI_TIMEOUT', retryable: true }); }
    finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  });
});
