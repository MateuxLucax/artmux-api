import express from 'express'
import WorkController from '../controller/WorkController'

const router = express.Router()

router.get('/', (req, res) => {
  res.status(200).json({ message: 'No works yet :(' })
})

router.post('/', WorkController.create)

export default router