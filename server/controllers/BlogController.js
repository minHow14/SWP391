// JavaScript source code
import { posts, blogs } from '../data/mockStore.js';

export const createBlog = (req, res) => {
    const { author_id, title, content, attached_video_id } = req.body;
    if (!author_id || !title || !content) {
        return res.status(400).json({ error: 'author_id, title, and content are required' });
    }

    const newPostId = posts.length ? Math.max(...posts.map(p => p.post_id)) + 1 : 1;
    const newPost = {
        post_id: newPostId,
        author_id,
        post_type: 'BLOG',
        status: 'PUBLISHED',
        created_at: new Date()
    };
    posts.push(newPost);

    const newBlog = {
        post_id: newPostId,
        title,
        content,
        attached_video_id: attached_video_id || null
    };
    blogs.push(newBlog);

    return res.status(201).json({ ...newPost, ...newBlog });
};

export const getAllBlogs = (req, res) => {
    const activeBlogs = blogs
        .map(blog => {
            const parentPost = posts.find(p => p.post_id === blog.post_id);
            return parentPost && parentPost.status !== 'DELETED' ? { ...parentPost, ...blog } : null;
        })
        .filter(Boolean);

    return res.status(200).json(activeBlogs);
};

export const getBlogById = (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const blog = blogs.find(b => b.post_id === postId);
    const post = posts.find(p => p.post_id === postId);

    if (!blog || !post || post.status === 'DELETED') {
        return res.status(404).json({ error: 'Blog post not found' });
    }

    return res.status(200).json({ ...post, ...blog });
};

export const updateBlog = (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const blog = blogs.find(b => b.post_id === postId);

    if (!blog) {
        return res.status(404).json({ error: 'Blog not found' });
    }

    const { title, content, attached_video_id } = req.body;
    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = content;
    if (attached_video_id !== undefined) blog.attached_video_id = attached_video_id;

    return res.status(200).json(blog);
};

export const deleteBlog = (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const post = posts.find(p => p.post_id === postId);

    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    // Soft delete pattern as per ERD status ENUM
    post.status = 'DELETED';
    return res.status(200).json({ message: 'Blog deleted successfully' });
};