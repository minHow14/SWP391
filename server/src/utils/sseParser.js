// D:/SWP391/SWP391/server/src/utils/sseParser.js
const MAX_BUFFER_LENGTH = 1_048_576;
const EVENT_BOUNDARY = /\r\n\r\n|\n\n|\r\r/;

function parseBlock(block) {
  let name = 'message';
  const data = [];
  for (const line of block.split(/\r\n|\r|\n/)) {
    if (line.startsWith('event:')) name = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  return data.length ? { name, data: JSON.parse(data.join('\n')) } : null;
}

export function createSseParser(onEvent) {
  let buffer = '';
  let stopped = false;
  const emit = async (block) => {
    const event = parseBlock(block);
    if (event && await onEvent(event) === false) stopped = true;
  };
  return {
    get stopped() { return stopped; },
    async push(chunk) {
      buffer += chunk;
      if (buffer.length > MAX_BUFFER_LENGTH) throw new Error('AI stream exceeds its buffer limit');
      let boundary = EVENT_BOUNDARY.exec(buffer);
      while (boundary && !stopped) {
        await emit(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary[0].length);
        boundary = EVENT_BOUNDARY.exec(buffer);
      }
    },
    async end() { if (!stopped && buffer.trim()) await emit(buffer); },
  };
}
