// JavaScript source code
import express from 'express';
import * as controller from '../controllers/VideoController.js';

const router = express.Router();
router.post('/', controller.createVideo);
router.get('/', controller.getAllVideos);
router.get('/:id', controller.getVideoById);
router.put('/:id', controller.updateVideo);
router.delete('/:id', controller.deleteVideo);

export default router;