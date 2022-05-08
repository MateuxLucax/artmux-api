import { ErrorRequestHandler, Router } from "express"
import { appendFile } from "fs"
import { VERSION } from "../utils/environmentUtil"
import auth from "./auth"
import users from "./users"
import works from "./works"

const router = Router()

router.use("/auth", auth)
router.use("/users", users)
router.use("/works", works)

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
  const error = code == 500 ? 'Internal server error' : err?.message
  res.status(code)
  if (error) res.json({ error })
}
router.use(errMiddleware)

export default router