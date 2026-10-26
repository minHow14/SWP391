// d:\Projects\FPT\SWP391\server\src\repositories\report.repository.js
import prisma from '../config/prisma.js';

export const reportRepository = {
  findReportById(reportId, include = null, db = prisma) {
    return db.report.findUnique({
      where: { report_id: Number(reportId) },
      ...(include ? { include } : {}),
    });
  },

  findById(reportId, include = null, db = prisma) {
    return this.findReportById(reportId, include, db);
  },

  findFirstReport(where, include = null, db = prisma) {
    return db.report.findFirst({
      where,
      ...(include ? { include } : {}),
    });
  },

  findFirst(where, include = null, db = prisma) {
    return this.findFirstReport(where, include, db);
  },

  createReport(data, include = null, db = prisma) {
    return db.report.create({
      data,
      ...(include ? { include } : {}),
    });
  },

  create(data, include = null, db = prisma) {
    return this.createReport(data, include, db);
  },

  updateReport(reportId, data, include = null, db = prisma) {
    return db.report.update({
      where: { report_id: Number(reportId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  update(reportId, data, include = null, db = prisma) {
    return this.updateReport(reportId, data, include, db);
  },

  findManyReports(args = {}, db = prisma) {
    return db.report.findMany(args);
  },

  findMany(args = {}, db = prisma) {
    return this.findManyReports(args, db);
  },

  countReports(where = {}, db = prisma) {
    return db.report.count({ where });
  },

  count(args = {}, db = prisma) {
    const where = args.where !== undefined ? args.where : args;
    return this.countReports(where, db);
  },

  deleteManyReports(where = {}, db = prisma) {
    return db.report.deleteMany({ where });
  },

  deleteMany(where = {}, db = prisma) {
    return this.deleteManyReports(where, db);
  },
};

export default reportRepository;
