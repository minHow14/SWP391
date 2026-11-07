// D:/SWP391/SWP391/server/tests/contentModerationImages.test.js
import { mkdtemp, rm, truncate, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { detectImageMimeType } from '../src/utils/imageSignature.js';
import { loadModerationImage } from '../src/services/moderationImageLoader.js';
import { mergeModerationResults } from '../src/services/contentModerationProcessor.js';
import { haveSameModerationImages, moderationImageUrls } from '../src/services/contentModerationService.js';
import { createContentModerationAiService } from '../src/services/contentModerationAiService.js';
import { createBlogSchema } from '../src/validators/blog.validator.js';
import { createVideoSchema } from '../src/validators/video.validator.js';

const PNG_BYTES = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
const WEBP_BYTES = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(16)]);
const config = { url: 'http://127.0.0.1:8000', internalApiKey: 'a'.repeat(32) };
const job = { id: '47d23bf9-5ed9-4e9d-a731-3ecfe77b6399', postId: 1, contentVersion: 2,
  title: 'Sườn chay', content: 'Sườn chay làm từ đậu nành.' };
const textAllowed = { decision: 'ALLOW', reason: 'Món chay.', categories: [], evidence: [], modelName: 'm', policyVersion: '1' };
const imageAllowed = { decision: 'ALLOW', reason: 'Ảnh món chay.', categories: [], observations: [], modelName: 'm', policyVersion: '1' };
const imageFlagged = { decision: 'REVIEW', reason: 'Ảnh có đùi gà rán.', categories: ['ANIMAL_MEAT_PROMOTION'],
  observations: ['Đĩa đùi gà rán'], modelName: 'm', policyVersion: '1' };
const finding = (verdict, imageUrl = '/uploads/posts/a.png') => ({ imageUrl, decision: verdict.decision, reason: verdict.reason,
  categories: verdict.categories, observations: verdict.observations, errorCode: null });
const jsonResponse = (data) => new Response(JSON.stringify({ success: true, message: 'ok', data }),
  { headers: { 'Content-Type': 'application/json' } });
let directory;

beforeAll(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'moderation-images-'));
  await writeFile(path.join(directory, 'dish.png'), PNG_BYTES);
  await writeFile(path.join(directory, 'dish.webp'), WEBP_BYTES);
  await writeFile(path.join(directory, 'fake.jpg'), Buffer.from('<html>not an image</html>'));
  await writeFile(path.join(directory, 'huge.png'), PNG_BYTES);
  await truncate(path.join(directory, 'huge.png'), 10 * 1024 * 1024 + 1);
});
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

describe('image signature', () => {
  it('detects the real format from the file header', () => {
    expect(detectImageMimeType(PNG_BYTES)).toBe('image/png');
    expect(detectImageMimeType(WEBP_BYTES)).toBe('image/webp');
    expect(detectImageMimeType(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(12)]))).toBe('image/jpeg');
    expect(detectImageMimeType(Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(8)]))).toBe('image/gif');
    expect(detectImageMimeType(Buffer.from('plain text file'))).toBeNull();
    expect(detectImageMimeType(Buffer.from([0x89]))).toBeNull();
  });
});

describe('moderation image loader', () => {
  it('returns base64 and the detected MIME type of an uploaded image', async () => {
    await expect(loadModerationImage('/uploads/posts/dish.webp', { directory }))
      .resolves.toEqual({ mimeType: 'image/webp', imageBase64: WEBP_BYTES.toString('base64') });
  });
  it.each([
    '/uploads/posts/../../.env', '/uploads/avatars/dish.png', 'https://example.com/dish.png',
    '/uploads/posts/missing.png', '/uploads/posts/fake.jpg', '/uploads/posts/huge.png', '/uploads/posts/clip.mp4',
  ])('marks %s as unreadable without leaving the upload folder', async (imageUrl) => {
    await expect(loadModerationImage(imageUrl, { directory })).rejects.toHaveProperty('errorCode', 'MODERATION_IMAGE_UNREADABLE');
  });
});

describe('moderation image selection', () => {
  it('keeps uploaded images only, deduplicated and capped at seven', () => {
    const images = Array.from({ length: 9 }, (_, index) => `/uploads/posts/p${index}.jpg`);
    expect(moderationImageUrls(['/uploads/posts/a.png', '/uploads/posts/clip.mp4', '/uploads/posts/a.png',
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', '', null])).toEqual(['/uploads/posts/a.png']);
    expect(moderationImageUrls(images)).toHaveLength(7);
  });
  it('detects added, removed, replaced and reordered images', () => {
    expect(haveSameModerationImages(['/uploads/posts/a.png'], ['/uploads/posts/a.png', '/uploads/posts/clip.mp4'])).toBe(true);
    expect(haveSameModerationImages(['/uploads/posts/a.png'], ['/uploads/posts/b.png'])).toBe(false);
    expect(haveSameModerationImages([], ['/uploads/posts/a.png'])).toBe(false);
    expect(haveSameModerationImages(['/uploads/posts/a.png', '/uploads/posts/b.png'], ['/uploads/posts/b.png', '/uploads/posts/a.png'])).toBe(false);
  });
});

describe('merging text and image verdicts', () => {
  it('keeps the original text result when the job had no images', () => {
    expect(mergeModerationResults(textAllowed, [])).toEqual(textAllowed);
  });
  it('allows the post only when the text and every image are allowed', () => {
    expect(mergeModerationResults(textAllowed, [finding(imageAllowed)]))
      .toEqual({ ...textAllowed, imageFindings: [finding(imageAllowed)] });
  });
  it('hides the post when an image alone is flagged and explains which image', () => {
    const findings = [finding(imageAllowed, '/uploads/posts/a.png'), finding(imageFlagged, '/uploads/posts/b.png')];
    expect(mergeModerationResults(textAllowed, findings)).toEqual({ ...textAllowed, decision: 'REVIEW',
      reason: 'Ảnh 2: Ảnh có đùi gà rán.', categories: ['ANIMAL_MEAT_PROMOTION'], imageFindings: findings });
  });
  it('keeps the text reason and unions categories when both are flagged', () => {
    const textFlagged = { ...textAllowed, decision: 'REVIEW', reason: 'Lừa đảo.', categories: ['SCAM'], evidence: ['đậu nành'] };
    expect(mergeModerationResults(textFlagged, [finding(imageFlagged)]))
      .toMatchObject({ decision: 'REVIEW', reason: 'Lừa đảo.', categories: ['SCAM', 'ANIMAL_MEAT_PROMOTION'], evidence: ['đậu nành'] });
  });
});

describe('image moderation AI boundary', () => {
  const image = { mimeType: 'image/png', imageBase64: PNG_BYTES.toString('base64') };
  it('sends the image with the post text as context to the internal image endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(imageFlagged));
    const ai = createContentModerationAiService({ fetchImpl, config });
    await expect(ai.moderateImage({ job, imageIndex: 1, image })).resolves.toEqual(imageFlagged);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8000/api/v1/image-moderations');
    expect(options.headers['X-Internal-Api-Key']).toBe(config.internalApiKey);
    expect(JSON.parse(options.body)).toEqual({ jobId: job.id, contentType: 'POST', contentVersion: 2, title: job.title,
      content: job.content, imageIndex: 1, mimeType: 'image/png', imageBase64: image.imageBase64 });
  });
  it.each([
    { ...imageFlagged, observations: [] },
    { ...imageFlagged, categories: [] },
    { ...imageAllowed, categories: ['SPAM'] },
    { ...imageAllowed, evidence: [] },
    { ...imageAllowed, decision: 'BLOCK' },
  ])('rejects an inconsistent image verdict', async (data) => {
    const ai = createContentModerationAiService({ config, fetchImpl: async () => jsonResponse(data) });
    await expect(ai.moderateImage({ job, imageIndex: 0, image })).rejects.toHaveProperty('errorCode', 'MODERATION_AI_INVALID_OUTPUT');
  });
});

describe('post media link rules', () => {
  const blog = (url) => createBlogSchema.safeParse({ title: 'Món chay', content: 'Nội dung', attachments: [{ url }] }).success;
  const video = (fields) => createVideoSchema.safeParse({ title: 'Món chay', ...fields });
  it('accepts only files uploaded to /uploads/posts as attachments', () => {
    expect(blog('/uploads/posts/7e34de09-c8e1-4d55-90ed-baa3b9f22692.jpg')).toBe(true);
    expect(blog('/uploads/posts/protein-thuc-vat.JPG')).toBe(true);
    expect(blog('/uploads/posts/cooking.mp4')).toBe(true);
    for (const url of ['https://example.com/a.jpg', '/uploads/avatars/a.jpg', '/uploads/posts/../a.jpg', '/uploads/posts/a.svg', '/uploads/posts/a.jpg?x=1']) {
      expect(blog(url)).toBe(false);
    }
  });
  it('accepts only YouTube video links and stores the canonical watch URL', () => {
    expect(video({ video_url: 'https://youtu.be/3MySvzHeUyo' }).data.video_url).toBe('https://www.youtube.com/watch?v=3MySvzHeUyo');
    expect(video({ video_url: 'https://www.youtube.com/shorts/3MySvzHeUyo' }).data.video_url).toBe('https://www.youtube.com/watch?v=3MySvzHeUyo');
    for (const videoUrl of ['https://vimeo.com/123', 'http://www.youtube.com/watch?v=3MySvzHeUyo',
      'https://www.youtube.com/watch?v=3MySvzHeUyo&list=PL1', '/uploads/posts/clip.mp4']) {
      expect(video({ video_url: videoUrl }).success).toBe(false);
    }
  });
  it('accepts uploaded or YouTube thumbnails only', () => {
    const base = { video_url: 'https://www.youtube.com/watch?v=3MySvzHeUyo' };
    for (const thumbnail of [undefined, null, '', '/uploads/posts/cover.webp', 'https://i.ytimg.com/vi/3MySvzHeUyo/hqdefault.jpg',
      'https://img.youtube.com/vi/3MySvzHeUyo/maxresdefault.jpg']) {
      expect(video({ ...base, thumbnail_url: thumbnail }).success).toBe(true);
    }
    for (const thumbnail of ['https://example.com/cover.jpg', 'http://img.youtube.com/vi/3MySvzHeUyo/hqdefault.jpg',
      'https://img.youtube.com.evil.com/vi/3MySvzHeUyo/hqdefault.jpg', '/uploads/posts/cover.mp4']) {
      expect(video({ ...base, thumbnail_url: thumbnail }).success).toBe(false);
    }
  });
});
