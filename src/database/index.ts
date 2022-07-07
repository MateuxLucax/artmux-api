import Knex from "knex"
import { ENV } from "../utils/environmentUtil"
import knexfile from "./knexfile"

const knex = Knex(knexfile[ENV])

export default knex