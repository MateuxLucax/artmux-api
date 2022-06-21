import express from "express"
import UserController from "../controller/UserController"
import { authMiddleware } from "../middleware/authMiddleware"

const controller = new UserController()

const router = express.Router()

router.use(authMiddleware())

router.get("/me", controller.me)

export default router