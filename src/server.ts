import express from "express"
import cors from "cors"
import morgan from "morgan"
import { PORT, HOSTNAME, CORS_ORIGIN } from "./utils/environmentUtil"
import routes from "./routes"

const app = express()

app.use(cors({ origin: CORS_ORIGIN }))

app.use(morgan("dev"))
app.use(express.json())

app.use(routes)

app.listen(PORT, () => {
    console.info(`Server listening under ${HOSTNAME}:${PORT}`)
})