import { ErrorRequestHandler, Router } from "express"
import { VERSION } from "../utils/environmentUtil"
import auth from "./auth"
import users from "./users"
import artworks from "./artworks"

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

const errMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  console.trace(err)
  const code = 'statusCode' in err ? err.statusCode : 500
  const error = code == 500 ? 'Internal server error' : err.errorMessage
  res.status(code)
  if (error) res.json({ error })
  else res.end()
}
router.use(errMiddleware)

export default router