// JavaScript source code
// src/data/mockStore.js

export const posts = [
    { post_id: 1, author_id: 101, post_type: 'BLOG', status: 'PUBLISHED', created_at: new Date('2026-01-10') },
    { post_id: 2, author_id: 102, post_type: 'VIDEO', status: 'PUBLISHED', created_at: new Date('2026-02-15') },
    { post_id: 3, author_id: 101, post_type: 'BLOG', status: 'PUBLISHED', created_at: new Date('2026-03-01') }
];

export const blogs = [
    { post_id: 1, title: 'Keto Diet Essentials for Beginners', content: 'Keto focuses on high-fat, low-carb meals for weight loss.', attached_video_id: null },
    { post_id: 3, title: 'Top High-Protein Meal Prep Hacks', content: 'Learn how to prep chicken and tofu efficiently.', attached_video_id: 2 }
];

export const videos = [
    { post_id: 2, title: 'How to Cook Low-Carb Meal Prep', video_url: 'https://cdn.example.com/videos/2.mp4', thumbnail_url: 'https://cdn.example.com/thumbs/2.jpg', duration: 420, transcript: 'Welcome to keto cooking! Today we prep low-carb chicken bowls.' }
];

export const comments = [
    { comment_id: 1, post_id: 1, user_id: 201, content: 'Great article on keto!', is_flagged_by_ai: false, status: 'ACTIVE', created_at: new Date('2026-01-11') }
];

export const postVotes = [
    { user_id: 201, post_id: 1, vote_type: 'UPVOTE' }
];

export const categories = [
    { category_id: 1, name: 'Keto' },
    { category_id: 2, name: 'High-Protein' }
];

export const postCategories = [
    { post_id: 1, category_id: 1 },
    { post_id: 2, category_id: 1 },
    { post_id: 3, category_id: 2 }
];

export const recipes = [
    { recipe_id: 1, post_id: 2, diet_type_id: 1, recipe_name: 'Keto Chicken Salad', prep_time: 15, total_calories: 450, instructions: 'Mix chicken with olive oil and greens.' }
];

export const restaurants = [
    { restaurant_id: 1, name: 'Keto Corner Eatery', address: '123 Main St', latitude: 10.7769, longitude: 106.7009, diet_type_id: 1 },
    { restaurant_id: 2, name: 'Protein House', address: '456 High St', latitude: 10.7800, longitude: 106.7050, diet_type_id: 2 }
];

export const restaurantRecipes = [
    { restaurant_id: 1, recipe_id: 1 }
];
