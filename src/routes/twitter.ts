import express from "express"
import TwitterController from "../controller/TwitterController"

const router = express.Router()

const controller = new TwitterController()

router.get("/link/v1/callback", controller.callbackV1)

export default router