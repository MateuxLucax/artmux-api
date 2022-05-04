import { Request, Response } from "express"
import { UserModel } from "../model/User"
import { randomBytes } from 'crypto'

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

    const salt = randomBytes(16).toString('base64')
    const hashedPassword = await userModel.hashPassword(password, email, salt)

    const createdUser = await userModel.create(username, email, hashedPassword, salt)

    return response.json(createdUser[0])
  }

}