// server/tests/youtubeMetadata.test.js
import { describe, expect, it, vi } from 'vitest';
import { createYoutubeMetadataService } from '../src/services/youtubeMetadataService.js';

const SOURCE = { videoId: 'AbCdEfGhI12', videoUrl: 'https://www.youtube.com/watch?v=AbCdEfGhI12' };
const metadata = (patch = {}) => ({ id: SOURCE.videoId, title: 'Video fixture', duration: 660, live_status: 'not_live',
  availability: 'public', formats: [{ acodec: 'opus', url: 'https://media.invalid/audio' }], ...patch });
const service = (data) => createYoutubeMetadataService({ execute: vi.fn().mockResolvedValue({ stdout: JSON.stringify(data) }) });

describe('metadata gate before AI', () => {
  it('accepts 660 seconds without downloading media or invoking a shell', async () => {
    const execute = vi.fn().mockResolvedValue({ stdout: JSON.stringify(metadata()) });
    const inspector = createYoutubeMetadataService({ execute });
    expect(await inspector.inspect(SOURCE)).toMatchObject({ videoId: SOURCE.videoId, durationSeconds: 660 });
    const [command, args, options] = execute.mock.calls[0];
    expect(command).toBeTruthy();
    expect(args).toContain('--skip-download');
    expect(args).toContain('--ignore-config');
    expect(args).toContain('--no-playlist');
    expect(args.at(-1)).toBe(SOURCE.videoUrl);
    expect(options).toMatchObject({ windowsHide: true, shell: false });
    expect(options.timeout).toBeGreaterThan(0);
  });
  it('rejects overlong videos before any AI boundary', async () => {
    await expect(service(metadata({ duration: 661 })).inspect(SOURCE)).rejects.toMatchObject({ errorCode: 'VIDEO_TOO_LONG' });
  });
  it.each([{ duration: null }, { duration: 0 }, { live_status: 'is_live' }, { is_live: true },
    { availability: 'private' }, { formats: [] }, { id: 'Different12' }, { _type: 'playlist' }])('fails closed for invalid metadata %j', async (patch) => {
    await expect(service(metadata(patch)).inspect(SOURCE)).rejects.toHaveProperty('errorCode');
  });
  it('reports a missing metadata executable without exposing stderr', async () => {
    const inspector = createYoutubeMetadataService({ execute: vi.fn().mockRejectedValue(Object.assign(new Error('SECRET_STDERR'), { code: 'ENOENT' })) });
    await expect(inspector.inspect(SOURCE)).rejects.toMatchObject({ errorCode: 'VIDEO_INSPECTOR_UNAVAILABLE' });
    await expect(inspector.inspect(SOURCE)).rejects.not.toThrow('SECRET_STDERR');
  });
  it('classifies a metadata deadline as retryable instead of an inaccessible video', async () => {
    const inspector = createYoutubeMetadataService({ execute: vi.fn().mockRejectedValue(Object.assign(new Error('PRIVATE_TIMEOUT_DETAIL'), { killed: true, signal: 'SIGTERM' })) });
    await expect(inspector.inspect(SOURCE)).rejects.toMatchObject({ errorCode: 'VIDEO_METADATA_TIMEOUT', retryable: true, statusCode: 504 });
  });
});
