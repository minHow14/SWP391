// d:\Projects\FPT\SWP391\server\src\routes\index.js
import express from 'express';
import authRoutes from './auth.route.js';
import blogRoutes from './blog.route.js';
import videoRoutes from './video.route.js';
import commentRoutes from './comment.route.js';
import voteRoutes from './vote.route.js';
import searchRoutes from './search.route.js';
import recommendationRoutes from './recommendation.route.js';
import placesRoutes from './places.route.js';
import workspaceRoutes from './workspace.route.js';
import adminRoutes from './admin.route.js';
import uploadRoutes from './upload.route.js';
import aiLogRoutes from './aiLogRoutes.js';
import guestQuotaRoutes from './guestQuotaRoutes.js';
import reportRoutes from './report.route.js';
import aiRoutes from './ai.route.js';
import aiGenerationRoutes from './aiGenerationRoutes.js';
import notificationRoutes from './notification.route.js';

const router = express.Router();

// ==========================================
// 1. CHUẨN RESTful API V1 (/api/v1/...)
// ==========================================
const v1Router = express.Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/blogs', blogRoutes);
v1Router.use('/videos', videoRoutes);
v1Router.use('/comments', commentRoutes);
v1Router.use('/votes', voteRoutes);
v1Router.use('/search', searchRoutes);
v1Router.use('/recommendations', recommendationRoutes);
v1Router.use('/places', placesRoutes);
v1Router.use('/workspace', workspaceRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/upload', uploadRoutes);
v1Router.use('/ai-logs', aiLogRoutes);
v1Router.use('/guest-quotas', guestQuotaRoutes);
v1Router.use('/reports', reportRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/ai-generations', aiGenerationRoutes);
v1Router.use('/notifications', notificationRoutes);

// Gắn chuẩn v1
router.use('/v1', v1Router);

// ==========================================
// 2. TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY)
// ==========================================
router.use('/auth', authRoutes);
router.use('/blogs', blogRoutes);
router.use('/videos', videoRoutes);
router.use('/comments', commentRoutes);
router.use('/votes', voteRoutes);
router.use('/search', searchRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/places', placesRoutes);
router.use('/workspace', workspaceRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/reports', reportRoutes);
router.use('/ai', aiRoutes);
router.use('/notifications', notificationRoutes);

export default router;
