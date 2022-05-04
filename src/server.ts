import express from "express"
import cors from "cors"
import { PORT, HOSTNAME } from "./utils/environmentUtil"
import routes from "./routes"

const app = express()

app.use(express.json())
app.use(routes)

app.use(cors({
    origin: ["http://localhost:3000"]
}))

app.listen(PORT, () => {
    console.log(`Server listening under ${HOSTNAME}:${PORT}`)
})