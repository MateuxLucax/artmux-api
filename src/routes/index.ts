import express from "express"
import { VERSION } from "../utils/environmentUtil"
import user from "./users"
import auth from "./auth"

const router = express.Router()

router.use("/users", user)
router.use("/auth", auth)

router.get("/", (req, res) => {
  res.json({
    name: "artmux-api",
    version: VERSION || "1.0.0",
  })
})

router.use((req, res) => {
  res.status(404)
})

export default router