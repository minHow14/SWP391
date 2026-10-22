// d:\Projects\FPT\SWP391\server\src\controllers\report.controller.js
import * as reportService from '../services/report.service.js';
import { sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const createReport = asyncHandler(async (req, res) => {
  const result = await reportService.createReport(req.user.user_id, req.body);
  return sendCreated(res, {
    message: 'Báo cáo vi phạm đã được gửi thành công đến ban quản trị',
    data: result,
  });
});
