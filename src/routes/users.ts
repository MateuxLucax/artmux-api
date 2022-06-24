import express from "express"
import UserController from "../controller/UserController"
import { authMiddleware } from "../middleware/authMiddleware"

const router = express.Router()

router.use(authMiddleware())

router.get("/me", UserController.me)

export default router