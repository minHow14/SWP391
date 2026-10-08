// JavaScript source code
import { postVotes, posts } from '../data/mockStore.js';

export const castOrUpdateVote = (req, res) => {
    const { user_id, post_id, vote_type } = req.body;

    if (!user_id || !post_id || !['UPVOTE', 'DOWNVOTE'].includes(vote_type)) {
        return res.status(400).json({ error: 'Valid user_id, post_id, and vote_type (UPVOTE|DOWNVOTE) are required' });
    }

    const post = posts.find(p => p.post_id === post_id);
    if (!post || post.status === 'DELETED') {
        return res.status(404).json({ error: 'Post not found' });
    }

    const existingVote = postVotes.find(v => v.user_id === user_id && v.post_id === post_id);

    if (existingVote) {
        existingVote.vote_type = vote_type;
        return res.status(200).json({ message: 'Vote updated', vote: existingVote });
    }

    const newVote = { user_id, post_id, vote_type };
    postVotes.push(newVote);
    return res.status(201).json({ message: 'Vote cast successfully', vote: newVote });
};

export const removeVote = (req, res) => {
    const { user_id, post_id } = req.body;
    const index = postVotes.findIndex(v => v.user_id === user_id && v.post_id === post_id);

    if (index === -1) {
        return res.status(404).json({ error: 'Vote not found' });
    }

    postVotes.splice(index, 1);
    return res.status(200).json({ message: 'Vote removed successfully' });
};

export const getPostVoteSummary = (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const votes = postVotes.filter(v => v.post_id === postId);

    const upvotes = votes.filter(v => v.vote_type === 'UPVOTE').length;
    const downvotes = votes.filter(v => v.vote_type === 'DOWNVOTE').length;

    return res.status(200).json({ post_id: postId, upvotes, downvotes, score: upvotes - downvotes });
};