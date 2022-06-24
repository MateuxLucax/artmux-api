import { Request, Response, NextFunction } from "express"
import knex from '../database'
import { TagModel } from "../model/TagModel";

export default class TagController {

  static async all(request: Request, response: Response, next: NextFunction) {
    try {
      response.status(200).json(await TagModel.findByUser(request.user.id));
    } catch(err) {
      next(err);
    }
  }

  static async patch(request: Request, response: Response, next: NextFunction) {
    try {
      const { name } = request.body
      const { id } = request.params

      if (!name) {
        return response.status(400).json({ message: "Malformed request" })
      }

      const result = await TagModel.updateNameById(Number(id), name, request.user.id)

      response.status(200).json({
        "updated": result
      })
    } catch (err) {
      next(err);
    }
  }

  static async delete(request: Request, response: Response, next: NextFunction) {
    try {
      const { id } = request.params
      const result = await TagModel.removeById(Number(id), request.user.id)

      response.status(200).json({
        "deleted": result
      })
    } catch (err) {
      next(err);
    }

  }

}