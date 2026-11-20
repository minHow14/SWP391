// D:/SWP391/SWP391/server/src/controllers/admin.controller.js
// Controller khu vực quản trị: nhận request đã qua xác thực ADMIN, gọi adminService/purgeService
// và trả response chuẩn { success, message, data, meta }. Không chứa logic nghiệp vụ.
import * as adminService from '../services/admin.service.js';
import * as purgeService from '../services/purge.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { legacyAiLogResponse } from '../utils/legacyAiLogResponse.js';
import { getSystemHealth as checkSystemHealth } from '../services/adminHealthService.js';

// Trả về tình trạng sức khỏe hệ thống (DB, AI Service...).
export const getSystemHealth = asyncHandler(async (req, res) => {
  return sendSuccess(res, { data: await checkSystemHealth() });
});

// FE-01: Quản lý thành viên
// Danh sách người dùng có phân trang theo query (tìm kiếm, lọc trạng thái...).
export const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách người dùng thành công',
    data: result.users,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

// Toàn bộ nội dung do một người dùng tạo, giúp admin đánh giá trước khi xử lý.
export const getUserContent = asyncHandler(async (req, res) => {
  const result = await adminService.getUserContent(req.params.id);
  return sendSuccess(res, {
    message: 'Lấy nội dung của người dùng thành công',
    data: result,
  });
});

// Khóa/mở khóa tài khoản; truyền currentAdminId để service chặn admin tự khóa chính mình.
export const updateUserStatus = asyncHandler(async (req, res) => {
  const updatedUser = await adminService.updateUserStatus({
    targetUserId: req.params.id,
    status: req.body.status,
    currentAdminId: req.user.user_id,
  });
  return sendSuccess(res, {
    message: 'Cập nhật trạng thái người dùng thành công',
    data: updatedUser,
  });
});

// Xóa mềm tài khoản; currentAdminId để chặn admin tự xóa chính mình.
export const deleteUser = asyncHandler(async (req, res) => {
  const deletedUser = await adminService.deleteUser({
    targetUserId: req.params.id,
    currentAdminId: req.user.user_id,
  });
  return sendSuccess(res, {
    message: 'Xóa người dùng thành công',
    data: deletedUser,
  });
});

// Khôi phục tài khoản đã bị xóa mềm.
export const restoreUser = asyncHandler(async (req, res) => {
  const restoredUser = await adminService.restoreUser(req.params.id);
  return sendSuccess(res, {
    message: 'Khôi phục tài khoản người dùng thành công',
    data: restoredUser,
  });
});

// FE-02: Quản lý bài viết và video
// Danh sách bài viết & video có phân trang cho trang quản trị.
export const getPosts = asyncHandler(async (req, res) => {
  const result = await adminService.getPosts(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách bài viết & video thành công',
    data: result.posts,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

// Đổi trạng thái kiểm duyệt của bài viết.
export const updatePostStatus = asyncHandler(async (req, res) => {
  const updatedPost = await adminService.updatePostStatus({
    postId: req.params.id,
    status: req.body.status,
  });
  return sendSuccess(res, {
    message: 'Cập nhật trạng thái bài viết thành công',
    data: updatedPost,
  });
});

// Admin chỉnh sửa nội dung bài viết vi phạm; truyền currentUser để service ghi nhận người sửa.
export const updatePost = asyncHandler(async (req, res) => {
  const updatedPost = await adminService.updatePost({
    postId: req.params.id,
    ...req.body,

    currentUser: req.user,
  });
  return sendSuccess(res, {
    message: 'Chỉnh sửa bài viết vi phạm thành công',
    data: updatedPost,
  });
});

// Xóa bài viết: mặc định xóa mềm (ẩn), ?permanent=true thì xóa vĩnh viễn.
export const deletePost = asyncHandler(async (req, res) => {
  const isPermanent = req.query.permanent === 'true';
  const result = await adminService.deletePost(req.params.id, { permanent: isPermanent });
  return sendSuccess(res, {
    message: isPermanent ? 'Xóa vĩnh viễn bài viết thành công' : 'Đã ẩn bài viết thành công',
    data: result,
  });
});

// Khôi phục bài viết đã bị ẩn/xóa mềm.
export const restorePost = asyncHandler(async (req, res) => {
  const restoredPost = await adminService.restorePost(req.params.id);
  return sendSuccess(res, {
    message: 'Khôi phục bài viết thành công',
    data: restoredPost,
  });
});

// FE-03: Quản lý bình luận
// Danh sách bình luận có phân trang cho trang quản trị.
export const getComments = asyncHandler(async (req, res) => {
  const result = await adminService.getComments(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách bình luận thành công',
    data: result.comments,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

// Đổi trạng thái hiển thị của bình luận.
export const updateCommentStatus = asyncHandler(async (req, res) => {
  const updatedComment = await adminService.updateCommentStatus({
    commentId: req.params.id,
    status: req.body.status,
  });
  return sendSuccess(res, {
    message: 'Cập nhật trạng thái bình luận thành công',
    data: updatedComment,
  });
});

// Xóa bình luận: mặc định xóa mềm, ?permanent=true thì xóa vĩnh viễn.
export const deleteComment = asyncHandler(async (req, res) => {
  const isPermanent = req.query.permanent === 'true';
  const result = await adminService.deleteComment(req.params.id, { permanent: isPermanent });
  return sendSuccess(res, {
    message: isPermanent ? 'Xóa vĩnh viễn bình luận thành công' : 'Đã ẩn bình luận thành công',
    data: result,
  });
});

// Khôi phục bình luận đã bị xóa mềm.
export const restoreComment = asyncHandler(async (req, res) => {
  const restoredComment = await adminService.restoreComment(req.params.id);
  return sendSuccess(res, {
    message: 'Khôi phục bình luận thành công',
    data: restoredComment,
  });
});

// FE-04: Quản lý danh mục
// Lấy toàn bộ danh mục.
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await adminService.getCategories();
  return sendSuccess(res, {
    message: 'Lấy danh sách danh mục thành công',
    data: categories,
  });
});

// Tạo danh mục mới, trả 201.
export const createCategory = asyncHandler(async (req, res) => {
  const created = await adminService.createCategory(req.body);
  return sendCreated(res, {
    message: 'Tạo danh mục mới thành công',
    data: created,
  });
});

// Đổi tên danh mục.
export const updateCategory = asyncHandler(async (req, res) => {
  const updated = await adminService.updateCategory({
    categoryId: req.params.id,
    name: req.body.name,
  });
  return sendSuccess(res, {
    message: 'Cập nhật danh mục thành công',
    data: updated,
  });
});

// Xóa danh mục.
export const deleteCategory = asyncHandler(async (req, res) => {
  await adminService.deleteCategory(req.params.id);
  return sendSuccess(res, {
    message: 'Xóa danh mục thành công',
  });
});

// FE-05: Kiểm duyệt nội dung gắn cờ tự động bởi AI
// Danh sách nội dung bị AI gắn cờ đang chờ admin quyết định.
export const getAiFlaggedContent = asyncHandler(async (req, res) => {
  const flagged = await adminService.getAiFlaggedContent();
  return sendSuccess(res, {
    message: 'Lấy danh sách nội dung bị AI gắn cờ thành công',
    data: flagged,
  });
});

// Xử lý nội dung bị gắn cờ: APPROVE giữ lại, hành động khác thì gỡ bỏ nội dung.
export const resolveAiFlaggedItem = asyncHandler(async (req, res) => {
  const result = await adminService.resolveAiFlaggedItem(req.body);
  const isApproved = req.body.action === 'APPROVE';
  return sendSuccess(res, {
    message: isApproved ? 'Xử lý nội dung AI gắn cờ thành công' : 'Đã gỡ bỏ nội dung vi phạm thành công',
    data: result,
  });
});

// FE-06 & FE-07: Giám sát AI models, logs và metrics
// Trạng thái hoạt động của các mô hình AI.
export const getAiModels = asyncHandler(async (req, res) => {
  const models = await adminService.getAiModelsStatus();
  return sendSuccess(res, {
    message: 'Lấy trạng thái các mô hình AI thành công',
    data: models,
  });
});

// Nhật ký AI có phân trang; map sang định dạng cũ để trang quản trị hiện tại không phải sửa.
export const getAiLogs = asyncHandler(async (req, res) => {
  const result = await adminService.getAiLogs(req.query);
  return sendSuccess(res, {
    message: 'Lấy lịch sử hoạt động AI thành công',
    data: result.logs.map(legacyAiLogResponse),
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

// Chỉ số đánh giá chất lượng/hiệu năng AI.
export const getAiMetrics = asyncHandler(async (req, res) => {
  const metrics = await adminService.getAiMetrics();
  return sendSuccess(res, {
    message: 'Lấy chỉ số đánh giá AI thành công',
    data: metrics,
  });
});

// FE-08: Can thiệp thủ công AI
// Admin ghi đè/can thiệp thủ công kết quả AI.
export const interveneAi = asyncHandler(async (req, res) => {
  const result = await adminService.interveneAiAction(req.body);
  return sendSuccess(res, {
    message: 'Can thiệp thủ công kết quả AI thành công',
    data: legacyAiLogResponse(result),
  });
});

// Thống kê tổng hợp hoạt động AI theo query.
export const getAiLogStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getAiLogStats(req.query);
  return sendSuccess(res, {
    message: 'Lấy thống kê hoạt động AI thành công',
    data: stats,
  });
});

// Xem hạn mức hỏi AI của một khách theo guestId.
export const getGuestQuota = asyncHandler(async (req, res) => {
  const quota = await adminService.getGuestQuota(req.params.guestId);
  return sendSuccess(res, {
    message: 'Lấy hạn mức khách thành công',
    data: quota,
  });
});

// Đặt lại hạn mức khách; nhận cả guest_id (client cũ) lẫn guestId (client mới).
export const resetGuestQuota = asyncHandler(async (req, res) => {
  const guestId = req.body.guest_id || req.body.guestId;
  const result = await adminService.resetGuestQuota({
    guestId,
    adminId: req.user.user_id,
  });
  return sendSuccess(res, {
    message: 'Đặt lại hạn mức khách thành công',
    data: result,
  });
});

// Xóa cache câu trả lời chatbot, ghi lại admin thực hiện.
export const clearChatCache = asyncHandler(async (req, res) => {
  const result = await adminService.clearChatbotCache(req.user.user_id);
  return sendSuccess(res, {
    message: 'Đã xóa bộ nhớ đệm chatbot thành công',
    data: result,
  });
});

// FE-09: Quản lý báo cáo
// Danh sách báo cáo vi phạm có phân trang.
export const getReports = asyncHandler(async (req, res) => {
  const result = await adminService.getReports(req.query);
  return sendSuccess(res, {
    message: 'Lấy danh sách báo cáo vi phạm thành công',
    data: result.reports,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

// Cập nhật trạng thái báo cáo và hành động xử lý kèm theo.
export const updateReportStatus = asyncHandler(async (req, res) => {
  const result = await adminService.updateReportStatus({
    reportId: req.params.id,
    status: req.body.status,
    resolutionAction: req.body.resolutionAction,
  });
  return sendSuccess(res, {
    message: 'Xử lý báo cáo thành công',
    data: result,
  });
});

// Bảo trì & lưu trữ dữ liệu (Xóa mềm 30 ngày & tự động xóa cứng)
// Thống kê dữ liệu xóa mềm và số bản ghi sắp đến hạn xóa cứng.
export const getRetentionStats = asyncHandler(async (req, res) => {
  const stats = await purgeService.getRetentionStats(req.query);
  return sendSuccess(res, {
    message: 'Lấy thống kê lưu trữ và dọn dẹp dữ liệu thành công',
    data: stats,
  });
});

// Chạy thủ công việc xóa vĩnh viễn dữ liệu xóa mềm đã quá hạn lưu trữ.
export const purgeExpiredItems = asyncHandler(async (req, res) => {
  const result = await purgeService.purgeExpiredDeletedItems(req.query);
  return sendSuccess(res, {
    message: 'Thực thi dọn dẹp vĩnh viễn dữ liệu quá hạn thành công',
    data: result,
  });
});

// FE-10: Dashboard thống kê
// Số liệu dashboard; recentLogs được map sang định dạng log AI cũ để tương thích giao diện.
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  return sendSuccess(res, {
    message: 'Lấy dữ liệu thống kê tổng quan thành công',
    data: { ...stats, ai: { ...stats.ai, recentLogs: stats.ai.recentLogs.map(legacyAiLogResponse) } },
  });
});
