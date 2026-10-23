// d:\Projects\FPT\SWP391\server\tests/sseParser.test.js
import { expect, it } from 'vitest';
import { createSseParser } from '../src/utils/sseParser.js';

it('awaits metadata persistence and handles CRLF split at every byte', async () => {
  const events = [];
  const parser = createSseParser(async (event) => {
    await Promise.resolve();
    events.push(event);
    if (event.name === 'done') return false;
  });
  const input = ': ping\r\n\r\nevent: metadata\r\ndata: {"data":1}\r\n\r\nevent: done\r\ndata: {}\r\n\r\nevent: token\r\ndata: {}\r\n\r\n';
  for (const char of input) await parser.push(char);
  await parser.end();
  expect(events).toEqual([{ name: 'metadata', data: { data: 1 } }, { name: 'done', data: {} }]);
});
