import express from 'express';
import PublicationController from '../controller/PublicationController';

const router = express.Router();

router.post('/', PublicationController.create);
router.get('/:slug', PublicationController.getBySlug);
router.get('/', PublicationController.get);
router.patch('/:slug', PublicationController.update);
router.delete('/:slug', PublicationController.delete);

export default router;