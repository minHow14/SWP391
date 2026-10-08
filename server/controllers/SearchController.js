// JavaScript source code
import { blogs, videos, posts } from '../data/mockStore.js';

export const globalSearch = (req, res) => {
    const query = req.query.q ? req.query.q.toLowerCase().trim() : '';
    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const matchedBlogs = blogs
        .filter(b => b.title.toLowerCase().includes(query) || b.content.toLowerCase().includes(query))
        .filter(b => {
            const p = posts.find(post => post.post_id === b.post_id);
            return p && p.status !== 'DELETED';
        });

    const matchedVideos = videos
        .filter(v =>
            v.title.toLowerCase().includes(query) ||
            v.transcript.toLowerCase().includes(query)
        )
        .filter(v => {
            const p = posts.find(post => post.post_id === v.post_id);
            return p && p.status !== 'DELETED';
        });

    return res.status(200).json({
        query,
        results: {
            blogs: matchedBlogs,
            videos: matchedVideos
        }
    });
};