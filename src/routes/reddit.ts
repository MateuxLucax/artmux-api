import express from 'express'
import RedditController from '../controller/RedditController'
import authMiddleware from '../middleware/authMiddleware'

const router = express.Router()

router.use(authMiddleware)

router.post('/callback', RedditController.callback)

export default router