// D:/SWP391/SWP391/server/src/routes/index.js
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

const router = express.Router();

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
router.use('/v1/ai-logs', aiLogRoutes);
router.use('/v1/guest-quotas', guestQuotaRoutes);
router.use('/reports', reportRoutes);
router.use('/ai', aiRoutes);
router.use('/v1/ai-generations', aiGenerationRoutes);

export default router;
