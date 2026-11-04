// D:/SWP391/SWP391/client/src/services/legalDocumentService.js
import apiClient from './apiClient.js';

export const legalDocumentService = {
  getPublished: (slug, signal) => apiClient.get(`/v1/legal-documents/${encodeURIComponent(slug)}`, { signal }),
  getAdmin: (slug, signal) => apiClient.get(`/v1/admin/legal-documents/${encodeURIComponent(slug)}`, { signal }),
  save: (slug, document) => apiClient.put(`/v1/admin/legal-documents/${encodeURIComponent(slug)}`, document),
};
