import { Request, Response } from "express";
import AccessModel from "../model/AccessModel";
import TwitterModel from "../model/TwitterModel";
import TwitterController from "./TwitterController";

export default class AccessesController {

  static createAccount: Map<number, Function> = new Map()
      .set(TwitterModel.socialMediaId, TwitterController.generateLinkV1)

  static removeAccount: Map<number, Function> = new Map()
    .set(TwitterModel.socialMediaId, TwitterController.removeAccount)

  static async all(request: Request, response: Response) {
    try {
      const user = request.user.id

      const accesses = await AccessModel.all(user);

      return response.json(accesses)
    } catch (e) {
      response.status(400).json({ message: "Não foi possível carregar seus acessos." })
    }
  }

  static async create(request: Request, response: Response) {
    try {
      const { socialMedia } = request.params

      const callback = AccessesController.createAccount.get(Number(socialMedia))

      if (callback) await callback(request, response)
      else throw { message: "Não foi possível obter a rede social." }
    } catch (e: any) {
      response.status(400).json({ message: e.message ? e.message : "Não foi possível cadastrar seu acesso." })
    }
  }

  static async remove(request: Request, response: Response) {
    try {
      const { socialMediaId } = request.body

      const callback = AccessesController.removeAccount.get(Number(socialMediaId))

      if (callback) await callback(request, response)
      else throw { message: "Não foi possível remover a rede social." }
    } catch (e: any) {
      response.status(400).json({ message: e.message ? e.message : "Não foi possível remover seu acesso." })
    }
  }

}