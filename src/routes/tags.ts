import express from 'express';
import TagController from '../controller/TagController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware());

router.get('/', TagController.all);

export default router;