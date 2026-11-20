// d:\Projects\FPT\SWP391\server\src/utils/sseParser.js
// Bộ phân tích luồng Server-Sent Events (SSE) nhận từ AI Service, tách thành từng sự kiện JSON.
// Giới hạn bộ đệm 1MB để luồng bất thường không làm tràn bộ nhớ.
const MAX_BUFFER_LENGTH = 1_048_576;
// Ranh giới giữa các sự kiện SSE là một dòng trống (hỗ trợ cả CRLF, LF và CR).
const EVENT_BOUNDARY = /\r\n\r\n|\n\n|\r\r/;

// Phân tích một khối sự kiện: lấy tên event và ghép các dòng data rồi parse JSON.
function parseBlock(block) {
  let name = 'message';
  const data = [];
  for (const line of block.split(/\r\n|\r|\n/)) {
    if (line.startsWith('event:')) name = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  return data.length ? { name, data: JSON.parse(data.join('\n')) } : null;
}

// Tạo parser có trạng thái; onEvent trả về false để dừng xử lý các sự kiện tiếp theo.
export function createSseParser(onEvent) {
  let buffer = '';
  let stopped = false;
  const emit = async (block) => {
    const event = parseBlock(block);
    if (event && await onEvent(event) === false) stopped = true;
  };
  return {
    get stopped() { return stopped; },
    // Nhận thêm một đoạn dữ liệu, phát ra mọi sự kiện đã đủ và giữ phần còn dở trong bộ đệm.
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
    // Khi luồng kết thúc, xử lý nốt sự kiện cuối không có dòng trống phía sau.
    async end() { if (!stopped && buffer.trim()) await emit(buffer); },
  };
}
