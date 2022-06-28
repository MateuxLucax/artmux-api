import { Request, Response } from "express"
import { TwitterApi } from "twitter-api-v2"
import { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET } from "../utils/environmentUtil"
import TwitterState from "../utils/TwitterState"

export const CALLBACK_URL = "https://api.artmux.gargantua.one/twitter/user/callback"

export default class TwitterController {

  static async generateLink(_: Request, response: Response) {
    const client = new TwitterApi({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
    })

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL, { scope: ["users.read", "tweet.read" ,"tweet.write", "offline.access"] })

    TwitterState.Instance.setCode(state, codeVerifier)

    response.json({ url })
  }

  static async callback(request: Request, response: Response) {
    const state = request.query.state as string
    const code = request.query.code as string

    const { code: codeVerifier, state: storedState } = TwitterState.Instance.getCode(state)

    if (!codeVerifier || !state || !storedState || !code) {
      return response.status(400).send("You denied the app or your session expired!")
    } else if (state !== storedState) {
      return response.status(400).send("Stored tokens didn't match!")
    }

    const client = new TwitterApi({ 
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET
    })

    try {
      const { 
        client: loggedClient, 
        accessToken, 
        refreshToken, 
        expiresIn 
      } = await client.loginWithOAuth2({ code, codeVerifier, redirectUri: CALLBACK_URL })

      response.json({ accessToken, refreshToken, expiresIn, loggedClient })
    } catch (e) {
      console.error(e)
      response.status(403).send("Invalid verifier or access tokens!")
    }
  }

  static async me(request: Request, response: Response) {
    const { token } = request.body

    try {
      const client = new TwitterApi(token);

      const me = client.v2.me()

      return response.json({ me })
    } catch (e) {
      console.error(e)
      response.status(500).json(e)
    }
  }

  static async tweet(request: Request, response: Response) {
    const { token } = request.body

    try {
      const client = new TwitterApi(token)

      // TODO: wait for v1 access on twitter dev dashboard
      // const mediaId = await client.v1.uploadMedia(`${ARTWORK_IMG_DIRECTORY}/${imagem}`);
      const mediaId = ''

      const tweet = await client.v2.tweet('hack', {
        media: {
          media_ids: [mediaId]
        },
      })

      return response.json({ tweet, mediaId })
    } catch (e) {
      console.error(e)
      response.status(500).json(e)
    }
  }

}