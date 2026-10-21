// d:\Projects\FPT\SWP391\server\src\repositories\post.repository.js
import prisma from '../config/prisma.js';

export const postRepository = {
  async createPost(data, db = prisma) {
    return db.post.create({ data });
  },

  async createBlog(data, include = null, db = prisma) {
    return db.blog.create({
      data,
      ...(include ? { include } : {}),
    });
  },

  async createVideo(data, db = prisma) {
    return db.video.create({ data });
  },

  async findPostById(postId, include = null, db = prisma) {
    return db.post.findUnique({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  async findBlogById(postId, include = null, db = prisma) {
    return db.blog.findFirst({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  async findVideoById(postId, include = null, db = prisma) {
    return db.video.findFirst({
      where: { post_id: Number(postId) },
      ...(include ? { include } : {}),
    });
  },

  async findAllBlogs(args = {}, db = prisma) {
    return db.blog.findMany(args);
  },

  async findAllVideos(args = {}, db = prisma) {
    return db.video.findMany(args);
  },

  async updateBlog(postId, data, include = null, db = prisma) {
    return db.blog.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  async updateVideo(postId, data, include = null, db = prisma) {
    return db.video.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  async updatePost(postId, data, include = null, db = prisma) {
    return db.post.update({
      where: { post_id: Number(postId) },
      data,
      ...(include ? { include } : {}),
    });
  },

  async countPosts(args = {}, db = prisma) {
    return db.post.count(args);
  },

  async findPosts(args = {}, db = prisma) {
    return db.post.findMany(args);
  },
};
