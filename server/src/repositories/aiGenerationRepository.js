// d:\Projects\FPT\SWP391\server\src/repositories/aiGenerationRepository.js
// Repository lưu các lần sinh nội dung bằng AI (lịch sử kết quả) thuộc sở hữu của từng người dùng.
import prisma from '../config/prisma.js';

// Các cột trả về cho lịch sử sinh AI; không chọn userId vì truy vấn luôn đã lọc theo chủ sở hữu.
const GENERATION_SELECT = {
  id: true, type: true, status: true, modelName: true, requestPayload: true,
  responsePayload: true, errorCode: true, errorMessage: true,
  completedAt: true, createdAt: true, updatedAt: true,
};
// Luôn lọc theo userId để người dùng chỉ thấy bản ghi của chính mình; type/status là bộ lọc tùy chọn.
const whereOwned = ({ userId, type, status }) => ({ userId, ...(type && { type }), ...(status && { status }) });

export const aiGenerationRepository = {
  // Chạy nhiều thao tác trong cùng transaction.
  runTransaction(work, db = prisma) { return db.$transaction(work); },
  // Tạo bản ghi sinh AI mới.
  create(data, db = prisma) {
    return db.aiGeneration.create({ data, select: { id: true } });
  },
  // Cập nhật trạng thái/kết quả của bản ghi sinh AI.
  update({ id, data }, db = prisma) {
    return db.aiGeneration.update({ where: { id }, data, select: { id: true } });
  },
  // Tìm bản ghi theo id nhưng chỉ khi thuộc người dùng hiện tại (chống truy cập chéo).
  findOwned({ id, userId }, db = prisma) {
    return db.aiGeneration.findFirst({ where: { id, userId }, select: GENERATION_SELECT });
  },
  // Đếm số bản ghi phục vụ phân trang.
  count(query, db = prisma) { return db.aiGeneration.count({ where: whereOwned(query) }); },
  // Lấy một trang lịch sử, mới nhất trước; sắp thêm theo id để thứ tự ổn định khi trùng createdAt.
  findPage(query, db = prisma) {
    return db.aiGeneration.findMany({
      where: whereOwned(query), select: GENERATION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit, take: query.limit,
    });
  },
};
