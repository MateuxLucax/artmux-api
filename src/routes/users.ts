import express from "express"
import AuthController from "../controller/AuthController"

const controller = new AuthController()

const router = express.Router()

router.post("/", controller.signup)

export default router