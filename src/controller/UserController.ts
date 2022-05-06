import { Request, Response } from "express"
import { UserModel } from "../model/UserModel"

export default class UserController {

  async me(request: Request, response: Response) {
    request.user.id

    const user = await UserModel.findById(request.user.id)

    if (!user) {
      return response.status(404).json({ error: "User not found" })
    }

    response.json(user)
  }

}