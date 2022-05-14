import express from 'express'
import ArtworkController from '../controller/ArtworkController'

const router = express.Router()

router.get('/', ArtworkController.get)
router.get('/:slug/images/:size', ArtworkController.getImage)
router.get('/:slug', ArtworkController.getBySlug)
router.post('/', ArtworkController.create)
router.patch('/:slug', ArtworkController.update)
router.delete('/:slug', ArtworkController.delete)


export default router