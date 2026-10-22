// d:\Projects\FPT\SWP391\server\src\services\ai.service.js
import config from '../config/index.js';
import { aiRepository, getTodayVNDate, getQuotaResetIso } from '../repositories/ai.repository.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Chuẩn hóa định danh khách (guestId hoặc ip)
 */
const sanitizeGuestId = (guestId, ip) => {
  const raw = (guestId || '').trim();
  if (raw) return raw.slice(0, 100);
  return `ip:${ip || 'unknown'}`.slice(0, 100);
};

export const aiService = {
  /**
   * Lấy thông tin hạn mức sử dụng AI trong ngày
   */
  async getUsage({ user = null, guestId = '', ip = '' }) {
    if (user) {
      return {
        guest_id: String(user.user_id),
        daily_limit: 999,
        used: 0,
        remaining: 999,
        resets_at: getQuotaResetIso(),
        is_authenticated: true,
      };
    }

    const validGuestId = sanitizeGuestId(guestId, ip);
    const usage = await aiRepository.getGuestUsage(
      validGuestId,
      getTodayVNDate(),
      config.ai.guestDailyLimit
    );

    return {
      guest_id: usage.guestId,
      daily_limit: usage.dailyLimit,
      used: usage.used,
      remaining: usage.remaining,
      resets_at: usage.resetsAt,
      is_authenticated: false,
    };
  },

  /**
   * Stream câu trả lời của trợ lý dinh dưỡng AI qua Server-Sent Events (SSE)
   */
  async streamChat(payload, { user = null, guestId = '', ip = '' }, res) {
    const isGuest = !user;
    const validGuestId = sanitizeGuestId(guestId, ip);

    // 1. Kiểm tra và giữ trước 1 lượt nếu là khách
    if (isGuest) {
      const remaining = await aiRepository.reserveGuestTurn(
        validGuestId,
        getTodayVNDate(),
        config.ai.guestDailyLimit
      );

      if (remaining === null) {
        throw ApiError.tooManyRequests(
          'Bạn đã dùng hết 3 lượt tư vấn miễn phí trong ngày hôm nay. Hãy đăng nhập tài khoản ChayXanh để sử dụng không giới hạn!'
        );
      }
    }

    let isStreamStarted = false;
    let turnRefunded = false;

    try {
      const aiResponse = await fetch(`${config.ai.url}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': config.ai.internalApiKey,
          ...(user ? { 'X-User-Id': String(user.user_id), 'X-User-Role': String(user.role) } : {}),
          ...(!user ? { 'X-Guest-Id': validGuestId } : {}),
        },
        body: JSON.stringify({
          message: payload.message,
          history: payload.history || [],
          dietary_type: payload.dietaryType || payload.dietary_type,
          menu_context: payload.menuContext || payload.menu_context,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Dịch vụ AI phản hồi lỗi: ${aiResponse.status} - ${errorText}`);
      }

      // Thiết lập Header SSE cho Client
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      isStreamStarted = true;

      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }

      // Ghi nhận thành công vào ai_logs
      await aiRepository.createLog({
        modelName: 'deepseek-chat',
        action: user ? `CHAT_STREAM_USER_${user.user_id}` : `CHAT_STREAM_GUEST_${validGuestId}`,
        status: 'SUCCESS',
      });

      res.end();
    } catch (error) {
      // Hoàn lại lượt nếu là khách và xảy ra sự cố
      if (isGuest && !turnRefunded) {
        await aiRepository.refundGuestTurn(validGuestId, getTodayVNDate()).catch(() => {});
        turnRefunded = true;
      }

      // Ghi log lỗi
      await aiRepository.createLog({
        modelName: 'deepseek-chat',
        action: user ? `CHAT_ERROR_USER_${user.user_id}` : `CHAT_ERROR_GUEST_${validGuestId}`,
        status: 'ERROR',
        errorFeedback: error.message,
      }).catch(() => {});

      if (!isStreamStarted) {
        throw ApiError.serviceUnavailable(
          'Trợ lý ảo hiện đang bận hoặc gặp sự cố kết nối. Lượt của bạn đã được hoàn lại. Vui lòng thử lại sau.'
        );
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
        res.end();
      }
    }
  },

  /**
   * Tạo thực đơn tuần với AI qua Server-Sent Events (SSE)
   */
  async streamMealPlan(payload, { user = null, guestId = '', ip = '' }, res) {
    const isGuest = !user;
    const validGuestId = sanitizeGuestId(guestId, ip);

    if (isGuest) {
      const remaining = await aiRepository.reserveGuestTurn(
        validGuestId,
        getTodayVNDate(),
        config.ai.guestDailyLimit
      );

      if (remaining === null) {
        throw ApiError.tooManyRequests(
          'Bạn đã dùng hết lượt tạo thực đơn hôm nay. Đăng nhập để sử dụng miễn phí không giới hạn!'
        );
      }
    }

    let isStreamStarted = false;
    let turnRefunded = false;

    try {
      const aiResponse = await fetch(`${config.ai.url}/api/meal-planner/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': config.ai.internalApiKey,
          ...(user ? { 'X-User-Id': String(user.user_id), 'X-User-Role': String(user.role) } : {}),
          ...(!user ? { 'X-Guest-Id': validGuestId } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Dịch vụ tạo thực đơn phản hồi lỗi: ${aiResponse.status} - ${errorText}`);
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      isStreamStarted = true;

      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }

      await aiRepository.createLog({
        modelName: 'deepseek-chat',
        action: user ? `MEAL_PLANNER_USER_${user.user_id}` : `MEAL_PLANNER_GUEST_${validGuestId}`,
        status: 'SUCCESS',
      });

      res.end();
    } catch (error) {
      if (isGuest && !turnRefunded) {
        await aiRepository.refundGuestTurn(validGuestId, getTodayVNDate()).catch(() => {});
        turnRefunded = true;
      }

      await aiRepository.createLog({
        modelName: 'deepseek-chat',
        action: user ? `MEAL_PLANNER_ERROR_${user.user_id}` : `MEAL_PLANNER_ERROR_GUEST_${validGuestId}`,
        status: 'ERROR',
        errorFeedback: error.message,
      }).catch(() => {});

      if (!isStreamStarted) {
        throw ApiError.serviceUnavailable(
          'Không thể khởi tạo thực đơn lúc này. Vui lòng kiểm tra lại thông tin và thử lại sau ít phút.'
        );
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
        res.end();
      }
    }
  },

  /**
   * Gọi AI Microservice xóa cache bộ nhớ câu trả lời chatbot
   */
  async clearChatbotCache() {
    const aiResponse = await fetch(`${config.ai.url}/api/admin/chatbot-cache/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': config.ai.internalApiKey,
      },
    }).catch(() => null);

    if (aiResponse && aiResponse.ok) {
      const data = await aiResponse.json().catch(() => ({}));
      return data?.data?.cleared ?? 0;
    }

    return 0;
  },
};
