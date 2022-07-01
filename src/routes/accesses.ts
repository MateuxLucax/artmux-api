import express from "express"
import AccessesController from "../controller/AccessController"
import authMiddleware from "../middleware/authMiddleware"

const router = express.Router()

router.use(authMiddleware)

router.get("/all", AccessesController.all)
router.get("/create/:socialMedia", AccessesController.create)

export default router