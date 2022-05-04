import express from "express"
import UserController from "../controller/UserController"
import { authMiddleware } from "../middlewares/authMiddleware"

const controller = new UserController()

const router = express.Router()

router.use(authMiddleware())

router.get("/me", controller.me)

export default router