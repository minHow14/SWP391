// JavaScript source code
import { videos, posts } from '../data/mockStore.js';
import { searchLocal } from '../services/PlacesService.js';

export const suggestByKeyword = (req, res) => {
    const keyword = req.query.keyword ? req.query.keyword.toLowerCase().trim() : '';

    if (!keyword) {
        return res.status(400).json({ error: 'Query parameter "keyword" is required' });
    }

    // 1. Suggest Videos based on title & transcript matches
    const suggestedVideos = videos
        .map(video => {
            const parentPost = posts.find(p => p.post_id === video.post_id);
            if (!parentPost || parentPost.status === 'DELETED') return null;

            let score = 0;
            if (video.title.toLowerCase().includes(keyword)) score += 5;
            if (video.transcript.toLowerCase().includes(keyword)) score += 2;

            return score > 0 ? { ...video, matchScore: score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.matchScore - a.matchScore);

    // 2. Suggest Restaurants (Shops) theo tên quán hoặc món quán phục vụ (dùng chung với /api/places)
    const suggestedShops = searchLocal({ query: keyword });

    return res.status(200).json({
        keyword,
        recommendations: {
            videos: suggestedVideos,
            shops: suggestedShops
        }
    });
};