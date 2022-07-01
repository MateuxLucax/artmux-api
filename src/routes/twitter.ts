import express from "express"
import TwitterController from "../controller/TwitterController"
import authMiddleware from '../middleware/authMiddleware'

const router = express.Router()

router.get("/link/v1/callback", TwitterController.callbackV1)
router.get("/link/v1/generate", authMiddleware, TwitterController.generateLinkV1)
router.post("/tweet", authMiddleware, TwitterController.tweet)

export default router