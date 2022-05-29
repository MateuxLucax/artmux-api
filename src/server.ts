import express from "express"
import cors from "cors"
import morgan from "morgan"
import { PORT, HOSTNAME, CORS_ORIGIN } from "./utils/environmentUtil"
import routes from "./routes"

const app = express()

app.use(morgan('dev'))
app.use(express.json())


// For testing; before routes!
app.use((req, res, next) => {
    req.user = { id: 1 }
    next()
})

app.use(routes)

app.use(cors({ origin: CORS_ORIGIN }))

app.listen(PORT, () => {
    console.log(`Server listening under ${HOSTNAME}:${PORT}`)
})