import express from 'express';
import PublicationController from '../controller/PublicationController';

const router = express.Router();

router.post('/', PublicationController.create);
router.get('/:slug', PublicationController.getBySlug);
router.get('/', PublicationController.get);

export default router;