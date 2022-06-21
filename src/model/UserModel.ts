import knex from "../database"
import { hash } from "bcrypt"
import { randomBytes } from "crypto"

export interface IUser {
  id?: number,
  username?: string,
  email?: string,
  password?: string,
  salt?: string,
  createdAt?: Date,
  updatedAt?: Date,
}

export class UserModel {

  static columns = {
    id: "id",
    username: "username",
    email: "email",
    password: "password",
    salt: "salt",
    createdAt: "created_at",
    updatedAt: "updated_at",
  }

  static table = "users"

  static async findByUsername(username: string): Promise<IUser> {
    return await knex.table(this.table).select(this.columns.id, this.columns.salt, this.columns.username, this.columns.email, this.columns.password).where({ username }).first()
  }

  static async findByEmail(email: string): Promise<IUser> {
    return await knex.table(this.table).select(this.columns.email).where({ email }).first()
  }

  static async findById(id: number): Promise<IUser> {
    return await knex.table(this.table).select(this.columns.username, this.columns.email).where({ id }).first()
  }

  static async create(username: string, email: string, password: string, salt: string): Promise<number[]> {
    return await knex.table(this.table).insert({ username, email, password, salt }).into(this.table).returning(this.columns.id)
  }

  static async hashPassword(password: string, username: string) {
    const salt = randomBytes(16).toString("base64")
    const hashedPassword = await hash(password + username + salt, 16)

    return { salt, hashedPassword }
  }
}