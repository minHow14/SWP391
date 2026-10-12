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

export default router;
