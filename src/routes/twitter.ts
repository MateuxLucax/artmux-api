import express from "express"
import TwitterController from "../controller/TwitterController"

const router = express.Router()

router.get("/link/generate", TwitterController.generateLink)
router.get("/link/callback", TwitterController.callback)
router.post("/tweet", TwitterController.tweet)
router.post("/me", TwitterController.me)

export default router