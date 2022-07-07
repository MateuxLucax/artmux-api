import knex from "../database"
import CryptoUtil, { ICrypto } from "../utils/CryptoUtil"

export type TwitterModelAccessData = {
  accessToken: ICrypto,
  accessSecret: ICrypto,
  user_id: ICrypto,
  user_username: ICrypto,
  user_name: ICrypto
}

export default class TwitterModel {

  static socialMediaId = 1

  static userFromData(row: any) {
    const data = row.data as TwitterModelAccessData
    const username = CryptoUtil.decrypt(data.user_username, CryptoUtil.createKey(row.salt))
    return {
      id: row.id,
      user: CryptoUtil.decrypt(data.user_id, CryptoUtil.createKey(row.salt)),
      username,
      profilePage: `https://twitter.com/${username}`
    }
  }

  static accessFromData(row: any) {
    const data = row.data as TwitterModelAccessData
    return {
      id: row.id,
      accessSecret: CryptoUtil.decrypt(data.accessSecret, CryptoUtil.createKey(row.salt)),
      accessToken: CryptoUtil.decrypt(data.accessToken, CryptoUtil.createKey(row.salt))
    }
  }

  static hashAccess(data: string, key: Buffer) {
    return CryptoUtil.encrypt(data, key)
  }

  static getAccess(hash: ICrypto, key: Buffer) {
    return CryptoUtil.decrypt(hash, key)
  }

  static async insertAccess(user_id: number, salt: string, data: TwitterModelAccessData) {
    return await knex.table("accesses")
      .insert({
        user_id,
        social_media_id: this.socialMediaId,
        salt,
        data: JSON.stringify(data)
      })
  }

  static async checkAccessAlreadyExists(user: number, newUserId: string) {
    let accesses = await knex.table("accesses")
      .select("id", "salt", "data")
      .where("user_id", "=", user)
      .andWhere("social_media_id", "=", this.socialMediaId)

    for (let access of accesses) {
      let data = access.data as TwitterModelAccessData
      const key = CryptoUtil.createKey(access.salt)
      if (data.user_id) {
        if (CryptoUtil.decrypt(data.user_id, key) === newUserId) {
          return true
        }
      }
    }
  }

  static async getAccessesFromUser(user: number) {
    return await knex.table("accesses")
      .select("*")
      .where("user_id", "=", user)
      .andWhere("social_media_id", "=", this.socialMediaId)
  }

  static async getAccessById(accessId: number, userId: number) {
    return this.accessFromData(await knex.table("accesses")
      .select("*")
      .where("id", accessId)
      .andWhere("user_id", userId)
      .first())
  }
}