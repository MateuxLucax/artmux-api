import { Request, Response, NextFunction } from "express"
import knex from '../database'
import { TagModel } from "../model/TagModel";

export default class TagController {

  static async all(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await TagModel.findByUser(req.user.id));
    } catch(err) {
      next(err);
    }
  }

}