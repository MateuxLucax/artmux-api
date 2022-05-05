import dotenv from "dotenv"

dotenv.config()

export const ENV = process.env.ENV || "dev"
export const HOSTNAME = process.env.HOSTNAME ||"http://localhost"
export const PORT = Number(process.env.PORT) || 4000
export const VERSION = process.env.VERSION || "1.0.0"

export const DB_CLIENT = process.env.DB_CLIENT || "pg"
export const DB_NAME = process.env.DB_NAME || "artmux"
export const DB_PORT = Number(process.env.DB_PORT) || 5432
export const DB_USER = process.env.DB_USER || "root"
export const DB_PASSWORD = process.env.DB_PASSWORD || "root"

export const JWT_SECRET = process.env.JWT_SECRET || "secret"