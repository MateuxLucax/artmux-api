import express from 'express'
import AuthController from "../controller/AuthController"

const router = express.Router()

router.post("/signup", AuthController.signup)
router.post("/signin", AuthController.signIn)

export default router