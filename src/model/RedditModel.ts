import knex from "../database"
import CryptoUtil, { ICrypto } from "../utils/CryptoUtil"

export type RedditAccess = {
  accessToken: ICrypto,
  userId: ICrypto,
  userName: ICrypto
}

export default class RedditModel {
  static socialMediaId = 2

  static async insertAccess(userId: number, salt: string, data: RedditAccess) {
    return await knex.table('accesses')
      .insert({
        user_id: userId,
        social_media_id: this.socialMediaId,
        salt,
        data: JSON.stringify(data)
      })
  }

  static userFromData(row: any) {
    const data = row.data as RedditAccess
    const salt = row.salt;
    const key = CryptoUtil.createKey(salt)
    const username = CryptoUtil.decrypt(data.userName, key);
    return {
      id: row.id,
      user: CryptoUtil.decrypt(data.userId, key),
      username, 
      profilePage: `https://reddit.com/u/${username}`
    }
  }
}