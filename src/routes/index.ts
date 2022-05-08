import { Router } from "express"
import { VERSION } from "../utils/environmentUtil"
import auth from "./auth"
import users from "./users"
import artworks from "./artworks"
import { errorMidleware } from "../middlewares/errorMiddleware"

const router = Router()

router.use("/auth", auth)
router.use("/users", users)
router.use("/artworks", artworks)

router.get("/", (req, res) => {
  res.json({
    name: "artmux-api",
    version: VERSION || "1.0.0",
  })
})

router.use((req, res) => {
  res.status(404).json({ error: "Not found" })
})

router.use(errorMidleware)

export default router