import express from "express"
import UserController from "../controller/UserController"
import authMiddleware from '../middleware/authMiddleware'

const router = express.Router()

router.use(authMiddleware)

router.get("/me", UserController.me)
router.patch("/me", UserController.patch)
router.patch("/me/password", UserController.updatePassword)

export default router