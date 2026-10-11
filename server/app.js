import express from 'express';
import blogRoutes from './routes/BlogRoute.js';
import videoRoutes from './routes/VideoRoute.js';
import commentRoutes from './routes/CommentRoute.js';
import voteRoutes from './routes/VoteRoute.js';
import searchRoutes from './routes/SearchRoute.js';
import recommendationRoutes from './routes/RecommendationRoute.js';
import placesRoutes from './routes/PlacesRoute.js';
import { requestId } from './middleware/requestId.js';

const app = express();
app.use(express.json());
app.use(requestId);

// API Endpoints
app.use('/api/blogs', blogRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/places', placesRoutes);

export default app;
