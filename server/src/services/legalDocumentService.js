// D:/SWP391/SWP391/server/src/services/legalDocumentService.js
import { legalDocumentRepository } from '../repositories/legalDocumentRepository.js';
import { ApiError } from '../utils/apiError.js';

export const legalDocumentService = {
  async get(slug, { includeDraft = false } = {}) {
    const document = await legalDocumentRepository.findBySlug(slug);
    if (!document || (!includeDraft && !document.published)) {
      throw ApiError.notFound('Nội dung này chưa được công bố.');
    }
    return document;
  },
  save(document) { return legalDocumentRepository.save(document); },
};
