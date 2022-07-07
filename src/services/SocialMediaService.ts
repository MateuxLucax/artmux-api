import { Request, Response } from "express"
import TwitterController from "../controller/TwitterController"
import TwitterModel from "../model/TwitterModel"

export default class SocialMediaService {

  static twitterController = new TwitterController()

  static createAccount: Map<number, SocialMediaFnType> = new Map()
    .set(TwitterModel.socialMediaId, this.twitterController.createAccount)

  static removeAccount: Map<number, SocialMediaFnType> = new Map()
    .set(TwitterModel.socialMediaId, this.twitterController.removeAccount)

  static publish: Map<number, SocialMediaFnType> = new Map()
    .set(TwitterModel.socialMediaId, this.twitterController.publish)

}

// Typescript can be a lil rough sometimes, this would be better typed with Java

export type SocialMediaFnType = (request: Request, response: Response) => Promise<void>

export interface CreateAccountFromSocialMedia {
  createAccount(request: Request, response: Response): Promise<void>
}

export interface RemoveAccountFromSocialMedia {
  removeAccount(request: Request, response: Response): Promise<void>
}

export interface PublishInSocialMedia {
  publish(request: Request, response: Response): Promise<void>
}