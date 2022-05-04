import { Request, Response } from "express"
import { UserModel } from "../model/User"

export default class UserController {

  async me(request: Request, response: Response) {
    const userModel = new UserModel()

    const user = await userModel.findById(request.user.id)

    if (!user) {
      return response.status(404).json({ error: "User not found" })
    }

    response.json(user)
  }

}