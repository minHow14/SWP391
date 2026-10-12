import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return sendCreated(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, result);
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.user_id);
  return sendSuccess(res, { user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateMe(req.user.user_id, req.body);
  return sendSuccess(res, { user });
});

