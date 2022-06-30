import { Request, Response } from "express"
import { TwitterApi } from "twitter-api-v2"
import { TWITTER_API_KEY, TWITTER_API_KEY_SECRET, TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET } from "../utils/environmentUtil"
import TwitterState from "../utils/TwitterState"

export const CALLBACK_URL_V1 = "https://api.artmux.gargantua.one/twitter/link/v1/callback"
export const CALLBACK_URL_V2 = "https://api.artmux.gargantua.one/twitter/link/v2/callback"
export const ARTMUX_URL = "https://artmux.gargantua.one/perfil/#accounts"

export default class TwitterController {

  static async generateLinkV1(_: Request, response: Response) {
    const client = new TwitterApi({
      appKey: TWITTER_API_KEY,
      appSecret: TWITTER_API_KEY_SECRET
    })

    const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(CALLBACK_URL_V1, { linkMode: "authorize" })

    TwitterState.Instance.setCode(oauth_token, oauth_token_secret)

    response.json({ url })
  }

  static async generateLinkV2(_: Request, response: Response) {
    const client = new TwitterApi({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
    })

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL_V2, { scope: ["users.read", "tweet.read" ,"tweet.write", "offline.access"] })

    TwitterState.Instance.setCode(state, codeVerifier)

    response.json({ url })
  }
  
  static async  callbackV1(request: Request, response: Response) {
    try {
      const { oauth_token, oauth_verifier } = request.query

      const { code: oauth_token_secret } = TwitterState.Instance.getCode(oauth_token as string)

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

      console.log({ loggedClient, accessToken, accessSecret })
      return response.redirect(ARTMUX_URL)
    } catch (error) {
      response.status(403).send("Invalid verifier or access tokens!")
    }
  }

  static async callbackV2(request: Request, response: Response) {
    try {
      const { state, code } = request.query

      const { code: codeVerifier, state: storedState } = TwitterState.Instance.getCode(state as string)

      if (!codeVerifier || !state || !storedState || !code) {
        return response.status(400).json({ message: "You denied the app or your session expired!" })
      } else if (state !== storedState) {
        return response.status(400).json({ message: "Stored tokens didn't match!" })
      }

      const client = new TwitterApi({ 
        clientId: TWITTER_CLIENT_ID,
        clientSecret: TWITTER_CLIENT_SECRET
      })

      const { 
        client: loggedClient, 
        accessToken, 
        refreshToken, 
        expiresIn 
      } = await client.loginWithOAuth2({ code: code as string, codeVerifier, redirectUri: CALLBACK_URL_V2 })

      console.log({ accessToken, refreshToken, expiresIn, loggedClient })

      return response.redirect(ARTMUX_URL)
    } catch (e) {
      console.error(e)
      response.status(403).json({ message: "Invalid verifier or access tokens!" })
    }
  }

  static async me(request: Request, response: Response) {
    try {
      const { token } = request.body

      const client = new TwitterApi(token)

      const me = client.v2.me()

      return response.json({ me })
    } catch (e) {
      console.error(e)
      response.status(500).json({ message: "couldn't retrieve your info."})
    }
  }

  static async tweet(request: Request, response: Response) {
    const { token } = request.body

    try {
      const client = new TwitterApi(token)

      // TODO: wait for v1 access on twitter dev dashboard
      // const mediaId = await client.v1.uploadMedia(`${ARTWORK_IMG_DIRECTORY}/${imagem}`)
      const mediaId = ""

      const tweet = await client.v2.tweet("hack", {
        media: {
          media_ids: [mediaId]
        },
      })

      return response.json({ tweet, mediaId })
    } catch (e) {
      console.error(e)
      response.status(500).json({ message: "couldn't make your tweet." })
    }
  }

}