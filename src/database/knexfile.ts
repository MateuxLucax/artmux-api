import { DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, DB_CLIENT, DB_HOST } from "../utils/environmentUtil"

interface KnexConfig {
  [key: string]: object
}

const knexConfig: KnexConfig = {
  development: {
    client: DB_CLIENT,
    connection: {
      host: DB_HOST,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT
    },
    migrations: {
      directory: `${__dirname}/migrations`,
    },
    seeds: {
      directory: `${__dirname}/seeds`,
    }
  }
}

export default knexConfig