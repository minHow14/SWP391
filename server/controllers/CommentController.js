// JavaScript source code
import { comments, posts } from '../data/mockStore.js';

export const createComment = (req, res) => {
    const { post_id, user_id, content } = req.body;
    if (!post_id || !user_id || !content) {
        return res.status(400).json({ error: 'post_id, user_id, and content are required' });
    }

    const targetPost = posts.find(p => p.post_id === post_id);
    if (!targetPost || targetPost.status === 'DELETED') {
        return res.status(404).json({ error: 'Post not found' });
    }

    const newCommentId = comments.length ? Math.max(...comments.map(c => c.comment_id)) + 1 : 1;
    const newComment = {
        comment_id: newCommentId,
        post_id,
        user_id,
        content,
        is_flagged_by_ai: false,
        status: 'ACTIVE',
        created_at: new Date()
    };
    comments.push(newComment);

    return res.status(201).json(newComment);
};

export const getCommentsByPost = (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const postComments = comments.filter(c => c.post_id === postId && c.status === 'ACTIVE');
    return res.status(200).json(postComments);
};

export const updateComment = (req, res) => {
    const commentId = parseInt(req.params.id, 10);
    const comment = comments.find(c => c.comment_id === commentId && c.status === 'ACTIVE');

    if (!comment) {
        return res.status(404).json({ error: 'Comment not found or inactive' });
    }

    if (req.body.content) {
        comment.content = req.body.content;
    }

    return res.status(200).json(comment);
};

export const deleteComment = (req, res) => {
    const commentId = parseInt(req.params.id, 10);
    const comment = comments.find(c => c.comment_id === commentId);

    if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
    }

    comment.status = 'DELETED';
    return res.status(200).json({ message: 'Comment deleted successfully' });
};