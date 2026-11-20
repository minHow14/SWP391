// d:\Projects\FPT\SWP391\server\src\controllers\report.controller.js
// Controller báo cáo vi phạm do người dùng gửi.
import * as reportService from '../services/report.service.js';
import { sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

// Tạo báo cáo vi phạm gắn với người dùng hiện tại, trả 201.
export const createReport = asyncHandler(async (req, res) => {
  const result = await reportService.createReport(req.user.user_id, req.body);
  return sendCreated(res, {
    message: 'Báo cáo vi phạm đã được gửi thành công đến ban quản trị',
    data: result,
  });
});
