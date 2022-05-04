import { Request, Response } from "express"
import { UserModel } from "../model/User"
import { randomBytes } from "crypto"
import { sign } from "jsonwebtoken";
import { JWT_SECRET } from "../utils/environmentUtil";
import { compare } from "bcrypt";

export default class AuthController {

  async signup(request: Request, response: Response) {
    const { username, password, email } = request.body

    const userModel = new UserModel()

    if (await userModel.findByUsername(username)) {
      return response.status(400).json({ error: "Username already registered" })
    }

    if (await userModel.findByEmail(email)) {
      return response.status(400).json({ error: "Email already registered" })
    }

    const salt = randomBytes(16).toString("base64")
    const hashedPassword = await userModel.hashPassword(password, username, salt)

    const createdUser = await userModel.create(username, email, hashedPassword, salt)

    return response.json(createdUser[0])
  }

  async signin(request: Request, response: Response) {
    const { username, password, keepLoggedIn } = request.body

    const userModel = new UserModel()

    const user = await userModel.findByUsername(username)

    if (!user) {
      return response.status(400).json({ error: "Username not found" })
    }

    const passwordMatch = compare(password + username + user.salt, user.password!)

    if (!passwordMatch) {
      return response.status(401).json({ error: "Invalid password" })
    }

    const expiresIn = keepLoggedIn ? "7d" : "1h"

    const token = sign({}, JWT_SECRET, {
      subject: user.id!.toString(),
      expiresIn
    })

    response.json({ token, expiresIn })
  }

}