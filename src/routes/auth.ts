import express from 'express'
import AuthController from "../controller/AuthController"

const router = express.Router()

const controller = new AuthController()

router.post("/signup", controller.signup)
router.post("/signin", controller.signin)

export default router