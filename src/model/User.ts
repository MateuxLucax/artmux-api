import knex from "../database"
import { hash } from "bcrypt"

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
  table: string = "users"

  async findByUsername(username: string): Promise<IUser> {
    return await knex.table(this.table).select('username').where({ username }).first()
  }

  async findByEmail(email: string): Promise<IUser> {
    return await knex.table(this.table).select('email').where({ email }).first()
  }

  async create(username: string, email: string, password: string, salt: string): Promise<number[]> {
    return await knex.table(this.table).insert({ username, email, password, salt }).into(this.table).returning('id')
  }

  async hashPassword(password: string, email: string, salt: string): Promise<string> {
    return await hash(password + email + salt, 16)
  }
}