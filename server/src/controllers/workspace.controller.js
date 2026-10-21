// d:\Projects\FPT\SWP391\server\src\controllers\workspace.controller.js
import { workspaceService } from '../services/workspace.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const getCatalog = asyncHandler(async (req, res) => {
  const catalog = await workspaceService.loadCatalog();
  return sendSuccess(res, { data: catalog });
});

export const getMine = asyncHandler(async (req, res) => {
  const posts = await workspaceService.getMyPosts(req.user.user_id);
  return sendSuccess(res, { data: posts });
});

export const getJournal = asyncHandler(async (req, res) => {
  const journal = await workspaceService.getJournal(req.user.user_id);
  return sendSuccess(res, { data: journal });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const result = await workspaceService.updateProfile(req.user.user_id, req.body);
  return sendSuccess(res, { data: result });
});

export const addDiaryEntry = asyncHandler(async (req, res) => {
  const entry = await workspaceService.addDiaryEntry(req.user.user_id, req.body);
  return sendSuccess(res, { data: entry });
});

export const deleteDiaryEntry = asyncHandler(async (req, res) => {
  const result = await workspaceService.deleteDiaryEntry(req.user.user_id, req.params.id);
  return sendSuccess(res, { data: result });
});

export const setMealPlan = asyncHandler(async (req, res) => {
  const result = await workspaceService.setMealPlan(req.user.user_id, req.body);
  return sendSuccess(res, { data: result });
});

export const recordPlanToDiary = asyncHandler(async (req, res) => {
  const result = await workspaceService.recordPlanToDiary(req.user.user_id, req.body);
  return sendSuccess(res, { data: result });
});

export const suggestRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await workspaceService.suggestRestaurant(req.body);
  return sendSuccess(res, { data: restaurant });
});

export const reviewRestaurant = asyncHandler(async (req, res) => {
  const result = await workspaceService.reviewRestaurant(req.user.user_id, req.params.id, req.body);
  return sendSuccess(res, { data: result });
});

export const getIngredientImage = asyncHandler(async (req, res) => {
  const { bytes, mimeType, etag } = await workspaceService.getIngredientImage(req.params.id);
  res.set({
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=86400',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  });
  return res.send(bytes);
});
