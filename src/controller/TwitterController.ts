import { randomBytes } from "crypto"
import { Request, Response } from "express"
import { TwitterApi } from "twitter-api-v2"
import AccessModel from "../model/AccessModel"
import { PublicationModel } from "../model/PublicationModel"
import TwitterModel, { TwitterModelAccessData } from "../model/TwitterModel"
import { CreateAccountFromSocialMedia, PublishInSocialMedia, RemoveAccountFromSocialMedia } from "../services/SocialMediaService"
import { getArtworkImgPaths } from "../utils/artworkImg"
import CryptoUtil from "../utils/CryptoUtil"
import { TWITTER_API_KEY, TWITTER_API_KEY_SECRET } from "../utils/environmentUtil"
import TwitterState from "../utils/TwitterState"

export const CALLBACK_URL_V1 = "https://api.artmux.gargantua.one/twitter/link/v1/callback"
export const ARTMUX_URL = "https://artmux.gargantua.one/perfil/#accounts"

export default class TwitterController
implements
CreateAccountFromSocialMedia,
RemoveAccountFromSocialMedia,
PublishInSocialMedia
{

  async createAccount(request: Request, response: Response): Promise<void> {
    try {
      const client = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_KEY_SECRET
      })

      const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(CALLBACK_URL_V1, { linkMode: "authorize" })

      TwitterState.Instance.setCode({ state: oauth_token, code: oauth_token_secret, user: request.user.id })

      response.json({ redirect: url })
    } catch (_) {
      response.status(400).json({ message: "Não foi possível realizar o cadastro da sua conta." })
    }
  }

  async removeAccount(request: Request, response: Response): Promise<void> {
    try {
      const { id: accessId } = request.params
      const userId = request.user.id

      if (await AccessModel.remove(Number(accessId), userId)) {
        response.json({
          message: `Acesso removido com sucesso da nossa base de dados! Clique em "ok!" para ser direcionado a sua página com aplicativos conectados e revogar o acesso do artmux também.`,
          redirect: "https://twitter.com/settings/connected_apps"
        })
      } else {
        response.status(400).json({ message: "Não foi possível remover o seu acesso." })
      }
    } catch (_) {
      response.status(400).json({ message: "Algo deu errado ao remover o seu acesso." })
    }
  }

  async publish(request: Request, response: Response): Promise<void> {
    try {
      const { accessId, description, media } = request.body
      const { id: publicationId } = request.params

      const userId = request.user.id

      const artworks = await Promise.all(media.map(async (slug: string) => {
        return (await getArtworkImgPaths(userId, slug)).original
      }))

      const { accessToken, accessSecret } = await TwitterModel.getAccessById(accessId, userId)

      const client = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_KEY_SECRET,
        accessToken: accessToken as string,
        accessSecret: accessSecret as string,
      })

      const tweet = await client.v2.tweet(description as string)
      if (tweet.data.text == description && await PublicationModel.insertPublicationInSocialMedia(Number(publicationId), accessId, TwitterModel.socialMediaId))
        response.json({ message: "Publicação feita com sucesso!" })
      else
        response.status(400).json({ message: "Não foi possível fazer a publicação." })
    } catch (e) {
      console.log(e)
      response.status(500).json({ message: "Algo deu errado ao fazer a publicação." })
    }  
  }

  async callbackV1(request: Request, response: Response) {
    try {
      const { oauth_token, oauth_verifier } = request.query

      const { code: oauth_token_secret, user } = TwitterState.Instance.getCode(oauth_token as string)

      if (!oauth_token || !oauth_verifier || !oauth_token_secret || !user) {
        return response.status(400).json({ message: "You denied the app or your session expired!" })
      }

      const client = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_KEY_SECRET,
        accessToken: oauth_token as string,
        accessSecret: oauth_token_secret as string,
      })

      const { client: loggedClient, accessToken, accessSecret } = await client.login(oauth_verifier as string)

      const { data: me } = await loggedClient.v2.me()

      if (await TwitterModel.checkAccessAlreadyExists(user, me.id)) {
        return response.status(400).json({ message: "Usuário já cadastrado." })
      }

      const salt = randomBytes(16).toString('base64')

      const key = CryptoUtil.createKey(salt)

      const data: TwitterModelAccessData = {
        accessSecret: TwitterModel.hashAccess(accessSecret, key),
        accessToken: TwitterModel.hashAccess(accessToken, key),
        user_id: TwitterModel.hashAccess(me.id, key),
        user_username: TwitterModel.hashAccess(me.username, key),
        user_name: TwitterModel.hashAccess(me.name, key),
      }

      if (await TwitterModel.insertAccess(user, salt, data)) {
        return response.redirect(ARTMUX_URL)
      }

      response.status(400).json({ message: "Não foi possível cadastrar seu acesso." })
    } catch (_) {
      response.status(403).send("Invalid verifier or access tokens!")
    }
  }

}
