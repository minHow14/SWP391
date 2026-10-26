// d:\Projects\FPT\SWP391\server\src/services/aiStreamService.js
import { aiConfig } from '../config/aiConfig.js';
import { aiGatewayError, aiErrorEnvelope, normalizeAiError } from '../utils/aiGatewayError.js';
import { aiGenerationService } from './aiGenerationService.js';
import { promptTraceSchema } from '../validators/aiGenerationValidator.js';
import { guestQuotaService } from './guestQuotaService.js';
import { assertAiConfigured, openAiStream, readAiStream } from './aiTransportService.js';

const STREAM_PATHS = { chatbot: 'CHAT_STREAM', mealPlanner: 'MEAL_PLANNER' };
const writeEvent = (res, name, data) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);

function lifecycle(res) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(aiGatewayError({ status: 504, code: 'AI_TIMEOUT', message: 'Dịch vụ AI xử lý quá thời gian cho phép.' })), aiConfig.timeoutMs);
  const onClose = () => {
    if (!res.writableFinished) controller.abort(aiGatewayError({ code: 'AI_CLIENT_DISCONNECTED', message: 'Yêu cầu AI đã được hủy.' }));
  };
  res.once('close', onClose);
  return { signal: controller.signal, cleanup: () => { clearTimeout(timer); res.off('close', onClose); } };
}

function logData(context, status, error) {
  const actor = context.identity.userId ? `USER_${context.identity.userId}` : 'GUEST';
  return {
    modelName: context.modelName || 'ai-service', action: `${STREAM_PATHS[context.feature]}_${actor}`,
    status, errorFeedback: error ? error.errorCode || 'AI_PROVIDER_ERROR' : null,
  };
}

async function receiveEvent(context, { name, data }) {
  if (name === 'metadata') {
    const parsed = promptTraceSchema.safeParse(data.data);
    if (!parsed.success) throw aiGatewayError();
    await aiGenerationService.savePrompt(context, parsed.data);
    return;
  }
  if (name === 'error') throw aiGatewayError();
  if (name === 'done') {
    if (data.success === false || (context.feature === 'mealPlanner' && !data.data?.weeklyPlan?.length)) throw aiGatewayError();
    context.result = data;
    context.modelName = data.meta?.modelName || context.modelName || 'ai-service';
    return false;
  }
  if (name === 'token') context.reply += data.token || '';
  if (name === 'token' || name === 'progress') writeEvent(context.res, name, data);
}

async function generate(context) {
  if (!context.identity.userId) context.reservation = await guestQuotaService.reserveTurn({ guestId: context.identity.guestId });
  context.generationId = await aiGenerationService.start(context);
  context.signal.throwIfAborted();
  const response = await openAiStream(context);
  context.res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  context.res.flushHeaders();
  await readAiStream({ response, res: context.res, signal: context.signal, onEvent: (event) => receiveEvent(context, event) });
  context.signal.throwIfAborted();
  if (!context.result) throw aiGatewayError({ code: 'AI_STREAM_INTERRUPTED', message: 'Kết nối AI kết thúc trước khi trả kết quả đầy đủ.' });
  if (context.generationId && !context.promptMessages.length) throw aiGatewayError({ code: 'AI_PROMPT_MISSING' });
  await aiGenerationService.finish(context, logData(context, 'SUCCESS'));
  writeEvent(context.res, 'done', {
    ...context.result, remaining: context.reservation?.remaining ?? null,
    meta: { ...context.result.meta, requestId: context.requestId, generationId: context.generationId },
  });
  context.res.end();
}

async function failGeneration(context, originalError) {
  let error = normalizeAiError(originalError, context.signal);
  try {
    if (context.reservation) await guestQuotaService.releaseTurn(context.reservation);
    await aiGenerationService.fail(context, error, logData(context, 'ERROR', error));
  } catch {
    error = aiGatewayError({ status: 503, code: 'AI_STORAGE_ERROR', message: 'Không thể cập nhật trạng thái yêu cầu AI. Vui lòng thử lại sau.' });
  }
  if (context.res.destroyed) return;
  if (!context.res.headersSent) throw error;
  writeEvent(context.res, 'error', aiErrorEnvelope(error, context.requestId));
  context.res.end();
}

export async function streamAiResponse(options) {
  assertAiConfigured();
  const active = lifecycle(options.res);
  const context = { ...options, signal: active.signal, promptMessages: [], reply: '' };
  try { await generate(context); }
  catch (error) { await failGeneration(context, error); }
  finally { active.cleanup(); }
}
