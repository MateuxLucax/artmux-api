import TwitterModel from "./TwitterModel"
import RedditModel from './RedditModel'
import knex from "../database"

export default class AccessModel {

  static parseData: Map<number, Function> = new Map()
    .set(TwitterModel.socialMediaId, TwitterModel.userFromData)
    .set(RedditModel.socialMediaId, RedditModel.userFromData)

  static async all(user: number) {
    const socialMedias = await knex.table("social_medias").select("id", "name", "config")

    return await Promise.all(socialMedias.map(async socialMedia => {
      const accesses = await knex.table("accesses")
        .where("user_id", user)
        .andWhere("social_media_id", socialMedia.id)
        .select("*")

      const parser = this.parseData.get(Number(socialMedia.id))

      return {
        ...socialMedia,
        accesses: accesses && parser ? accesses.map(access => parser(access)) : [],
      }
    }))
  }

  static async remove(accessId: number, userId: number): Promise<boolean> {
    return await knex("accesses")
      .where("id", accessId)
      .andWhere("user_id", userId)
      .delete() >= 1
  }

  static async getById(accessId: number, userId: number) {
    const access = await knex.table("accesses")
      .select("*")
      .where("id", accessId)
      .andWhere("user_id", userId)
      .first()

    const parse = this.parseData.get(Number(access.social_media_id))

    return parse ? parse(access) : undefined
  }

}