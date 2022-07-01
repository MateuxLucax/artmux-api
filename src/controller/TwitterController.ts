import { randomBytes } from "crypto"
import { Request, Response } from "express"
import { TwitterApi } from "twitter-api-v2"
import AccessModel from "../model/AccessModel"
import TwitterModel, { TwitterModelAccessData } from "../model/TwitterModel"
import CryptoUtil from "../utils/CryptoUtil"
import { TWITTER_API_KEY, TWITTER_API_KEY_SECRET } from "../utils/environmentUtil"
import TwitterState from "../utils/TwitterState"

export const CALLBACK_URL_V1 = "https://api.artmux.gargantua.one/twitter/link/v1/callback"
export const ARTMUX_URL = "https://artmux.gargantua.one/perfil/#accounts"

export default class TwitterController {

  static async generateLinkV1(request: Request, response: Response) {
    const client = new TwitterApi({
      appKey: TWITTER_API_KEY,
      appSecret: TWITTER_API_KEY_SECRET
    })

    const user = request.user.id

    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(CALLBACK_URL_V1, { linkMode: "authorize" })

    TwitterState.Instance.setCode({ state: oauth_token, code: oauth_token_secret, user })

    response.json({ url })
  }
 
  static async callbackV1(request: Request, response: Response) {
    try {
      const { oauth_token, oauth_verifier } = request.query

      const { code: oauth_token_secret, user } = TwitterState.Instance.getCode(oauth_token as string)

      if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
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
        // TODO: redirecionar para uma pagina de erro no artmux para acessos?
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

  static async me(request: Request, response: Response) {
    try {
      const { accessToken, accessSecret } = request.body

      const client = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_KEY_SECRET,
        accessToken: accessToken as string,
        accessSecret: accessSecret as string,
      })

      const me = await client.v2.me()

      response.json({ me })
    } catch (_) {
      response.status(500).json({ message: "couldn't retrieve your info."})
    }
  }

  static async accesses(request: Request, response: Response) {
    try {
      const user = request.user.id

      let accesses = (await TwitterModel.getAccessesFromUser(user)).map(access => {
        const key = CryptoUtil.createKey(access.salt as string)
        let data = access.data as TwitterModelAccessData
        return {
          accessSecret: TwitterModel.getAccess(data.accessSecret, key),
          accessToken: TwitterModel.getAccess(data.accessToken, key),
          user_id: TwitterModel.getAccess(data.user_id, key),
          user_name: TwitterModel.getAccess(data.user_name, key),
          user_username: TwitterModel.getAccess(data.user_username, key),
        }
      })

      response.json(accesses)
    } catch (_) {
      response.status(500).json({ message: "couldn't retrieve your info." })
    }  
  }

  static async tweet(request: Request, response: Response) {
    try {
      const { accessToken, accessSecret } = request.body

      const client = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_KEY_SECRET,
        accessToken: accessToken as string,
        accessSecret: accessSecret as string,
      })

      // TODO: wait for v1 access on twitter dev dashboard
      // const mediaId = await client.v1.uploadMedia(`${ARTWORK_IMG_DIRECTORY}/${imagem}`)
      const mediaId = ""

      const tweet = await client.v2.tweet("hack", {
        media: {
          media_ids: [mediaId]
        },
      })

      response.json({ tweet, mediaId })
    } catch (_) {
      response.status(500).json({ message: "couldn't make your tweet." })
    }
  }

  static async removeAccount(request: Request, response: Response) {
    try {
      const { id: accessId } = request.params
      const userId = request.user.id

      if (await AccessModel.remove(Number(accessId), userId)) {
        response.json({ message: `Acesso removido com sucesso da nossa base de dados! Clique em "ok!" para ser direcionado a sua página com aplicativos conectados e revogar o acesso do artmux também.`, redirect: "https://twitter.com/settings/connected_apps" })  
      } else throw { message: "Não foi possível remover o acesso." }
    } catch (e: any) {
      response.status(400).json({ message: e.message ? e.message : "Não foi possível remover seu acesso." })
    }
  }
}
