// JavaScript source code
import express from 'express';
import blogRoutes from './routes/BlogRoute.js';
import videoRoutes from './routes/VideoRoute.js';
import commentRoutes from './routes/CommentRoute.js';
import voteRoutes from './routes/VoteRoute.js';
import searchRoutes from './routes/SearchRoute.js';
import recommendationRoutes from './routes/RecommendationRoute.js';

const app = express();
app.use(express.json());

// API Endpoints
app.use('/api/blogs', blogRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});