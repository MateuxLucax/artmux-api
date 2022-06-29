import express from "express"
import TwitterController from "../controller/TwitterController"

const router = express.Router()

router.get("/link/v1/generate", TwitterController.generateLinkV1)
router.get("/link/v2/generate", TwitterController.generateLinkV2)
router.get("/link/v1/callback", TwitterController.callbackV1)
router.get("/link/v2/callback", TwitterController.callbackV2)
router.post("/tweet", TwitterController.tweet)
router.post("/me", TwitterController.me)

export default router