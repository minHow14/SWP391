// JavaScript source code
import { videos, restaurants, recipes, restaurantRecipes, posts } from '../data/mockStore.js';

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

    // 2. Suggest Restaurants (Shops) based on name or recipe offerings
    const suggestedShops = restaurants
        .map(shop => {
            let score = 0;
            if (shop.name.toLowerCase().includes(keyword)) score += 5;

            // Find recipes offered by this restaurant
            const shopRecipeIds = restaurantRecipes
                .filter(rr => rr.restaurant_id === shop.restaurant_id)
                .map(rr => rr.recipe_id);

            const matchingRecipes = recipes.filter(
                r => shopRecipeIds.includes(r.recipe_id) && r.recipe_name.toLowerCase().includes(keyword)
            );

            score += matchingRecipes.length * 3;

            return score > 0 ? { ...shop, matchScore: score, matchedRecipes: matchingRecipes.map(r => r.recipe_name) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.matchScore - a.matchScore);

    return res.status(200).json({
        keyword,
        recommendations: {
            videos: suggestedVideos,
            shops: suggestedShops
        }
    });
};