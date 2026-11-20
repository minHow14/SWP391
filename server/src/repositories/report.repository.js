// d:\Projects\FPT\SWP391\server\src\repositories\report.repository.js
// Repository truy cập bảng báo cáo vi phạm; các hàm ngắn gọn (findById, create...) là bí danh của hàm đầy đủ.
import prisma from '../config/prisma.js';

export const reportRepository = {
  // Tìm báo cáo theo ID.
  findReportById(reportId, include = null, db = prisma) {
    return db.report.findUnique({
      where: { report_id: Number(reportId) },
      ...(include ? { include } : {}),
    });
  },

  // Bí danh của findReportById.
  findById(reportId, include = null, db = prisma) {
    return this.findReportById(reportId, include, db);
  },

  // Tìm báo cáo đầu tiên khớp điều kiện.
  findFirstReport(where, include = null, db = prisma) {
    return db.report.findFirst({
      where,
      ...(include ? { include } : {}),
    });
  },

  // Bí danh của findFirstReport.
  findFirst(where, include = null, db = prisma) {
    return this.findFirstReport(where, include, db);
  },

  // Tạo báo cáo mới.
  createReport(data, include = null, db = prisma) {
    return db.report.create({
      data,
      ...(include ? { include } : {}),
    });
  },

  // Bí danh của createReport.
  create(data, include = null, db = prisma) {
    return this.createReport(data, include, db);
  },

  // Cập nhật báo cáo theo ID.
  updateReport(reportId, data, include = null, db = prisma) {
    return db.report.update({
      where: { report_id: Number(reportId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  // Bí danh của updateReport.
  update(reportId, data, include = null, db = prisma) {
    return this.updateReport(reportId, data, include, db);
  },

  // Lấy danh sách báo cáo.
  findManyReports(args = {}, db = prisma) {
    return db.report.findMany(args);
  },

  // Bí danh của findManyReports.
  findMany(args = {}, db = prisma) {
    return this.findManyReports(args, db);
  },

  // Đếm báo cáo theo điều kiện where.
  countReports(where = {}, db = prisma) {
    return db.report.count({ where });
  },

  // Đếm báo cáo; chấp nhận cả dạng `{ where }` lẫn where trực tiếp để tương thích nhiều nơi gọi.
  count(args = {}, db = prisma) {
    const where = args.where !== undefined ? args.where : args;
    return this.countReports(where, db);
  },

  // Xóa nhiều báo cáo theo điều kiện.
  deleteManyReports(where = {}, db = prisma) {
    return db.report.deleteMany({ where });
  },

  // Bí danh của deleteManyReports.
  deleteMany(where = {}, db = prisma) {
    return this.deleteManyReports(where, db);
  },
};

export default reportRepository;
