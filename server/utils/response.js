// Định dạng response chuẩn của dự án: { success, data | error, meta: { requestId } }

export const ok = (res, data, status = 200, extraMeta = {}) =>
  res.status(status).json({
    success: true,
    data,
    meta: { requestId: res.locals.requestId, ...extraMeta },
  });

export const fail = (res, status, code, message, details) =>
  res.status(status).json({
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
    meta: { requestId: res.locals.requestId },
  });
