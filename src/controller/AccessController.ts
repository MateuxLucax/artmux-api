import { Request, Response } from "express"
import AccessModel from "../model/AccessModel"
import SocialMediaService from "../services/SocialMediaService"

export default class AccessesController {

  static async all(request: Request, response: Response) {
    try {
      const user = request.user.id

      const accesses = await AccessModel.all(user)

      return response.json(accesses)
    } catch (e) {
      response.status(400).json({ message: "Não foi possível carregar seus acessos." })
    }
  }

  static async create(request: Request, response: Response) {
    try {
      const { socialMedia } = request.params

      const callback = SocialMediaService.createAccount.get(Number(socialMedia))

      if (callback) await callback(request, response)
      else response.status(400).json({ message: "Não foi possível obter a rede social." })
    } catch (_) {
      response.status(400).json({ message: "Não foi possível cadastrar seu acesso." })
    }
  }

  static async remove(request: Request, response: Response) {
    try {
      const { socialMediaId } = request.body

      const callback = SocialMediaService.removeAccount.get(Number(socialMediaId))

      if (callback) await callback(request, response)
      else response.status(400).json({ message: "Não foi possível obter a rede social." })
    } catch (_) {
      response.status(400).json({ message: "Não foi possível remover seu acesso." })
    }
  }

}