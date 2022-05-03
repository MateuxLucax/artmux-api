import express, { application } from 'express'
import cors from 'cors'
import { PORT, HOSTNAME, VERSION } from './utils/EnvironmentUtil'


const app = express()

app.get('/', (req, res) => {
    res.json({
        name: 'artmux-api',
        version: VERSION || '1.0.0',
    })
})

app.use(cors({
    origin: ['http://localhost:3000']
}))

app.use((req, res) => {
    res.status(404)
})

app.listen(PORT, () => {
    console.log(`Server listening under ${HOSTNAME}:${PORT}`)
})