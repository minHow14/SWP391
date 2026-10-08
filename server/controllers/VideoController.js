// JavaScript source code
import { posts, videos } from '../data/mockStore.js';

export const createVideo = (req, res) => {
    const { author_id, title, video_url, thumbnail_url, duration, transcript } = req.body;
    if (!author_id || !title || !video_url) {
        return res.status(400).json({ error: 'author_id, title, and video_url are required' });
    }

    const newPostId = posts.length ? Math.max(...posts.map(p => p.post_id)) + 1 : 1;
    const newPost = {
        post_id: newPostId,
        author_id,
        post_type: 'VIDEO',
        status: 'PUBLISHED',
        created_at: new Date()
    };
    posts.push(newPost);

    const newVideo = {
        post_id: newPostId,
        title,
        video_url,
        thumbnail_url: thumbnail_url || '',
        duration: duration || 0,
        transcript: transcript || ''
    };
    videos.push(newVideo);

    return res.status(201).json({ ...newPost, ...newVideo });
};

export const getAllVideos = (req, res) => {
    const activeVideos = videos
        .map(video => {
            const parentPost = posts.find(p => p.post_id === video.post_id);
            return parentPost && parentPost.status !== 'DELETED' ? { ...parentPost, ...video } : null;
        })
        .filter(Boolean);

    return res.status(200).json(activeVideos);
};

export const getVideoById = (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const video = videos.find(v => v.post_id === postId);
    const post = posts.find(p => p.post_id === postId);

    if (!video || !post || post.status === 'DELETED') {
        return res.status(404).json({ error: 'Video not found' });
    }

    return res.status(200).json({ ...post, ...video });
};

export const updateVideo = (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const video = videos.find(v => v.post_id === postId);

    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }

    const { title, video_url, thumbnail_url, duration, transcript } = req.body;
    if (title !== undefined) video.title = title;
    if (video_url !== undefined) video.video_url = video_url;
    if (thumbnail_url !== undefined) video.thumbnail_url = thumbnail_url;
    if (duration !== undefined) video.duration = duration;
    if (transcript !== undefined) video.transcript = transcript;

    return res.status(200).json(video);
};

export const deleteVideo = (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const post = posts.find(p => p.post_id === postId);

    if (!post) {
        return res.status(404).json({ error: 'Video post not found' });
    }

    post.status = 'DELETED';
    return res.status(200).json({ message: 'Video deleted successfully' });
};