import { Request, Response } from "express"
import { UserModel } from "../model/UserModel"
import { sign } from "jsonwebtoken"
import { JWT_SECRET } from "../utils/environmentUtil"
import { compare } from "bcrypt"

export default class AuthController {

  static async signup(request: Request, response: Response) {
    const { username, password, email } = request.body

    if (!username || !password || !email) {
      return response.status(400).json({ message: "Malformed request" })
    }

    if (await UserModel.findByUsername(username)) {
      return response.status(400).json({ message: "Username already registered" })
    }

    if (await UserModel.findByEmail(email)) {
      return response.status(400).json({ message: "Email already registered" })
    }

    const { salt, hashedPassword } = await UserModel.hashPassword(password, username)

    const createdUser = await UserModel.create(username, email, hashedPassword, salt)

    return response.status(201).json(createdUser[0])
  }

  static async signin(request: Request, response: Response) {
    const { username, password, keepLoggedIn } = request.body

    if (!username || !password) {
      return response.status(400).json({ message: "Malformed request" })
    }

    const user = await UserModel.findByUsername(username)

    if (!user) {
      return response.status(400).json({ message: "Username not found" })
    }

    if (!await compare(password + username + user.salt, user.password!)) {
      return response.status(401).json({ message: "Invalid password" })
    }

    const expiresIn = keepLoggedIn ? "7d" : "1h"

    const token = sign({}, JWT_SECRET, {
      subject: user.id!.toString(),
      expiresIn
    })

    response.json({ token, expiresIn })
  }

}