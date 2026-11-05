// D:/SWP391/SWP391/server/src/repositories/legalDocumentRepository.js
import prisma from '../config/prisma.js';

export const legalDocumentRepository = {
  findBySlug(slug, db = prisma) {
    return db.legalDocument.findUnique({ where: { slug } });
  },
  save({ slug, title, content, published }, db = prisma) {
    const fields = { title, content, published, publishedAt: published ? new Date() : null };
    return db.legalDocument.upsert({
      where: { slug }, create: { slug, ...fields }, update: { ...fields, version: { increment: 1 } },
    });
  },
};
