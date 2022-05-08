import express from 'express'
import ArtworkController from '../controller/ArtworkController'

const router = express.Router()

router.get('/', (req, res) => {
  res.status(200).json({ message: 'No artworks yet :(' })
})

router.post('/', ArtworkController.create)

export default router