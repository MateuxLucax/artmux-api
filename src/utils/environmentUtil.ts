import dotenv from "dotenv"

dotenv.config()

export const ENV = process.env.ENV || "development"
export const HOSTNAME = process.env.HOSTNAME ||"http://localhost"
export const PORT = Number(process.env.PORT) || 4000
export const VERSION = process.env.VERSION || "1.0.0"

export const CORS_ORIGIN = process.env.CORS_ORIGIN?.split(",") || "*"

export const DB_CLIENT = process.env.DB_CLIENT || "pg"
export const DB_NAME = process.env.DB_NAME || "artmux"
export const DB_PORT = Number(process.env.DB_PORT) || 5432
export const DB_USER = process.env.DB_USER || "root"
export const DB_PASSWORD = process.env.DB_PASSWORD || "root"
export const DB_HOST = process.env.DB_HOST || "database"

export const JWT_SECRET = process.env.JWT_SECRET || "secret"
export const CRYPTO_SECRET = process.env.CRYPTO_SECRET || "secret"

export const TWITTER_API_KEY = process.env.TWITTER_API_KEY || "none"
export const TWITTER_API_KEY_SECRET = process.env.TWITTER_API_KEY_SECRET || "none"
export const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || "none"
export const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || "none"
export const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || "none"

export const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || "none"
export const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || "none"