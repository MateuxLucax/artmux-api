import { compare } from "bcrypt"
import { Request, Response, NextFunction } from "express"
import { UserModel } from "../model/UserModel"

export default class UserController {

  static async me(request: Request, response: Response) {
    const user = await UserModel.findById(request.user.id)

    if (!user) {
      return response.status(404).json({ error: "User not found" })
    }

    response.json(user)
  }

  static async patch(request: Request, response: Response, next: NextFunction) {
    try {
      const { username, email } = request.body
      let updated = {};

      if (username) {
        if (await UserModel.findByUsername(username)) {
          return response.status(400).json({ message: "Usuário já registrado" })
        }

        if (await UserModel.updateUsername(request.user.id, username)) {
          updated = {
            "user": true
          }
        }
      }

      if (email) {
        if (await UserModel.findByEmail(email)) {
          return response.status(400).json({ message: "Email já registrado" })
        }

        if (await UserModel.updateEmail(request.user.id, email)) {
          updated = {
            ...updated,
            "email": true
          }
        }
      }

      response.status(200).json(updated)
    } catch (err) {
      next(err);
    }
  }

  static async updatePassword(request: Request, response: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = request.body
      const userId = request.user.id

      if (!oldPassword || !newPassword) {
        return response.status(400).json({ message: "Corpo da requisição inválida!" })
      }

      const user = await UserModel.findById(userId, true);

      if (!await compare(oldPassword + user.username + user.salt, user.password!)) {
        return response.status(400).json({ message: "Senha atual incorreta!" })
      }

      const { hashedPassword, salt } = await UserModel.hashPassword(newPassword, user.username!)

      const updated = await UserModel.updatePassword(userId, hashedPassword, salt)

      response.status(updated ? 200 : 400).json({ updated })
    } catch (err) {
      next(err);
    }
  }
}