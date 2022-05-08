import express from 'express'
import ArtworkController from '../controller/ArtworkController'

const router = express.Router()

router.get('/', (req, res) => {
  // TODO list artworks from the user
  // TODO many filters, by title, by date, by tag...
  res.status(200).json({ message: 'No artworks yet :(' })
})

router.get('/:slug/images/:size', ArtworkController.getImage)

router.get('/:slug', ArtworkController.getBySlug)

router.post('/', ArtworkController.create)

export default router