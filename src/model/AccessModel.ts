import TwitterModel from "./TwitterModel";
import knex from "../database"

export default class AccessModel {

  static parseData: Map<number, Function> = new Map()
    .set(TwitterModel.socialMediaId, TwitterModel.userFromData)

  static async all(user: number) {
    const accesses = await knex.table({ sm: "social_medias" })
      .join({ a: "accesses" }, "a.social_media_id", "sm.id")
      .where("a.user_id", "=", user)
      .select("sm.id", "sm.name", "sm.config", knex.raw("JSONB_AGG(a.*) AS accesses"))
      .groupBy("sm.id")
      .orderBy("sm.id")

    return accesses.map(access => {
      return {
        ...access,
        accesses: access.accesses.map(this.parseData.get(Number(access.id))),
      }
    })
  }

}