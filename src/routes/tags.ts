import express from 'express';
import ArtworkController from '../controller/ArtworkController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware());

router.get('/', ArtworkController.getAllTags);

export default router;