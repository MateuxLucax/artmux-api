import { Router } from "express"
import { VERSION } from "../utils/environmentUtil"
import auth from "./auth"
import users from "./users"
import artworks from "./artworks"
import publications from "./publications"
import tags from "./tags";
import twitter from "./twitter"
import accesses from "./accesses"
import { errorMiddleware } from "../middleware/errorMiddleware"

const router = Router()

router.use("/auth", auth)
router.use("/users", users)
router.use("/artworks", artworks)
router.use("/publications", publications)
router.use("/tags", tags)
router.use("/twitter", twitter)
router.use("/accesses", accesses)

router.get("/", (_req, res) => {
  res.json({
    name: "artmux-api",
    version: VERSION || "1.0.0",
  })
})

router.use((_req, res) => {
  res.status(404).json({ error: "Not found" })
})

router.use(errorMiddleware)

export default router