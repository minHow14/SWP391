// d:\Projects\FPT\SWP391\server\src/services/aiStreamService.js
// Điều phối luồng stream AI (chatbot, lập thực đơn) qua SSE: giữ hạn mức khách, lưu lịch sử, ghi log và xử lý lỗi/hủy.
import { aiConfig } from '../config/aiConfig.js';
import { aiGatewayError, aiErrorEnvelope, normalizeAiError } from '../utils/aiGatewayError.js';
import { aiGenerationService } from './aiGenerationService.js';
import { promptTraceSchema } from '../validators/aiGenerationValidator.js';
import { guestQuotaService } from './guestQuotaService.js';
import { assertAiConfigured, openAiStream, readAiStream } from './aiTransportService.js';

// Tiền tố action trong log AI theo từng tính năng.
const STREAM_PATHS = { chatbot: 'CHAT_STREAM', mealPlanner: 'MEAL_PLANNER' };
// Ghi một sự kiện SSE xuống client.
const writeEvent = (res, name, data) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);

// Tạo AbortController gắn với vòng đời request: hủy khi quá thời gian hoặc khi client đóng kết nối.
function lifecycle(res) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(aiGatewayError({ status: 504, code: 'AI_TIMEOUT', message: 'Dịch vụ AI xử lý quá thời gian cho phép.' })), aiConfig.timeoutMs);
  const onClose = () => {
    if (!res.writableFinished) controller.abort(aiGatewayError({ code: 'AI_CLIENT_DISCONNECTED', message: 'Yêu cầu AI đã được hủy.' }));
  };
  res.once('close', onClose);
  return { signal: controller.signal, cleanup: () => { clearTimeout(timer); res.off('close', onClose); } };
}

// Dựng dữ liệu log AI; action ghi rõ người dùng hay khách để thống kê.
function logData(context, status, error) {
  const actor = context.identity.userId ? `USER_${context.identity.userId}` : 'GUEST';
  return {
    modelName: context.modelName || 'ai-service', action: `${STREAM_PATHS[context.feature]}_${actor}`,
    status, errorFeedback: error ? error.errorCode || 'AI_PROVIDER_ERROR' : null,
  };
}

// Xử lý từng sự kiện từ AI Service; trả về false ở sự kiện 'done' để parser dừng đọc.
async function receiveEvent(context, { name, data }) {
  // 'metadata' chứa prompt/trace để lưu lịch sử; phải đúng schema.
  if (name === 'metadata') {
    const parsed = promptTraceSchema.safeParse(data.data);
    if (!parsed.success) throw aiGatewayError();
    await aiGenerationService.savePrompt(context, parsed.data);
    return;
  }
  if (name === 'error') throw aiGatewayError();
  if (name === 'done') {
    // Thực đơn phải có ít nhất một ngày, nếu không coi như AI trả kết quả lỗi.
    if (data.success === false || (context.feature === 'mealPlanner' && !data.data?.weeklyPlan?.length)) throw aiGatewayError();
    context.result = data;
    context.modelName = data.meta?.modelName || context.modelName || 'ai-service';
    return false;
  }
  // Gom token để lưu toàn văn câu trả lời vào lịch sử.
  if (name === 'token') context.reply += data.token || '';
  // Chỉ chuyển tiếp token/progress cho client; metadata nội bộ không được lộ ra.
  if (name === 'token' || name === 'progress') writeEvent(context.res, name, data);
}

// Luồng chính: giữ lượt (khách), tạo lịch sử, mở stream, chuyển tiếp sự kiện rồi lưu kết quả.
async function generate(context) {
  // Chỉ khách bị trừ hạn mức; người dùng đăng nhập không giới hạn.
  if (!context.identity.userId) context.reservation = await guestQuotaService.reserveTurn({ guestId: context.identity.guestId });
  context.generationId = await aiGenerationService.start(context);
  context.signal.throwIfAborted();
  const response = await openAiStream(context);
  // Chỉ gửi header SSE sau khi mở được stream AI, để lỗi trước đó vẫn trả được JSON lỗi chuẩn.
  context.res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  context.res.flushHeaders();
  await readAiStream({ response, res: context.res, signal: context.signal, onEvent: (event) => receiveEvent(context, event) });
  context.signal.throwIfAborted();
  // Stream kết thúc mà không có sự kiện 'done' nghĩa là kết quả bị cụt.
  if (!context.result) throw aiGatewayError({ code: 'AI_STREAM_INTERRUPTED', message: 'Kết nối AI kết thúc trước khi trả kết quả đầy đủ.' });
  // Người dùng đăng nhập phải có prompt trace để lịch sử đầy đủ.
  if (context.generationId && !context.promptMessages.length) throw aiGatewayError({ code: 'AI_PROMPT_MISSING' });
  await aiGenerationService.finish(context, logData(context, 'SUCCESS'));
  writeEvent(context.res, 'done', {
    ...context.result, remaining: context.reservation?.remaining ?? null,
    meta: { ...context.result.meta, requestId: context.requestId, generationId: context.generationId },
  });
  context.res.end();
}

// Xử lý thất bại: hoàn lượt khách, ghi trạng thái lỗi; nếu đã bắt đầu stream thì gửi sự kiện 'error' thay vì JSON.
async function failGeneration(context, originalError) {
  let error = normalizeAiError(originalError, context.signal);
  try {
    if (context.reservation) await guestQuotaService.releaseTurn(context.reservation);
    await aiGenerationService.fail(context, error, logData(context, 'ERROR', error));
  } catch {
    error = aiGatewayError({ status: 503, code: 'AI_STORAGE_ERROR', message: 'Không thể cập nhật trạng thái yêu cầu AI. Vui lòng thử lại sau.' });
  }
  // Client đã ngắt kết nối thì không còn gì để gửi.
  if (context.res.destroyed) return;
  // Chưa gửi header thì ném lỗi để middleware trả JSON lỗi chuẩn.
  if (!context.res.headersSent) throw error;
  writeEvent(context.res, 'error', aiErrorEnvelope(error, context.requestId));
  context.res.end();
}

// Điểm vào: stream câu trả lời AI tới client và luôn dọn dẹp timer/listener khi kết thúc.
export async function streamAiResponse(options) {
  assertAiConfigured();
  const active = lifecycle(options.res);
  const context = { ...options, signal: active.signal, promptMessages: [], reply: '' };
  try { await generate(context); }
  catch (error) { await failGeneration(context, error); }
  finally { active.cleanup(); }
}
