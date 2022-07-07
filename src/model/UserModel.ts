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

  static async findById(id: number, allColumns = false): Promise<IUser> {
    return await knex.table(this.table).select(allColumns ? '*' : this.columns.username, this.columns.email).where({ id }).first()
  }

  static async create(username: string, email: string, password: string, salt: string): Promise<number[]> {
    return await knex.table(this.table).insert({ username, email, password, salt }).into(this.table).returning(this.columns.id)
  }

  static async hashPassword(password: string, username: string) {
    const salt = randomBytes(16).toString("base64")
    const hashedPassword = await hash(password + username + salt, 16)

    return { salt, hashedPassword }
  }

  // TODO: add updated_at = now()
  static async updateUsername(userId: number, username: string): Promise<boolean> {
    return await knex(this.table)
      .update({ username })
      .where(this.columns.id, userId) == 1
  }

  static async updateEmail(userId: number, email: string): Promise<boolean> {
    return await knex(this.table)
      .update({ email })
      .where(this.columns.id, userId) == 1
  }

  static async updatePassword(userId: number, password: string, salt: string): Promise<boolean> {
    return await knex(this.table)
      .update({ password, salt })
      .where(this.columns.id, userId) == 1
  }
}