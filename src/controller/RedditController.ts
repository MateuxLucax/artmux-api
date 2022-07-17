import { Request, Response, NextFunction } from 'express';
import { CreateAccountFromSocialMedia } from "../services/SocialMediaService";
import { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET } from '../utils/environmentUtil';

// Para submeter mídia ver https://github.com/praw-dev/praw/blob/master/praw/models/reddit/subreddit.py#L1105

export default class RedditController
implements
CreateAccountFromSocialMedia
{

  // Configurada no reddit.com/prefs/apps
  static redirectURI = 'http://localhost/perfil/reddit_redirect_uri.php'

  async createAccount(request: Request, response: Response): Promise<void> {
    const params = new URLSearchParams()
    params.set('client_id', REDDIT_CLIENT_ID)
    params.set('response_type', 'code')
    params.set('redirect_uri', RedditController.redirectURI);
    params.set('duration', 'temporary')
    params.set('scope', 'identity,submit')
    params.set('state', 'artmux-string-aleatoria')
    // ^ o ideal seria gerar uma string única para cada link para comparar com o state recebido quando o usuário confirmar

    const redirect = `https://www.reddit.com/api/v1/authorize?${params.toString()}`
    response.status(200).json({ redirect })
  }

  static async callback(request: Request, response: Response, next: NextFunction): Promise<void> {
    const { state, code } = request.body;
    if (state != 'artmux-string-aleatoria') {
      next({ statusCode: 400, errorMessage: "Parâmetro 'state' incorreto" })
      return
    }
    const url = 'https://www.reddit.com/api/v1/access_token';
    const postParams = new URLSearchParams()
    postParams.set('grant_type', 'authorization_code')
    postParams.set('code', code)
    postParams.set('redirect_uri', RedditController.redirectURI)

    console.log('postParams', postParams.toString())

    const headers = {
      'Authorization': `Basic ${Buffer.from(REDDIT_CLIENT_ID + ':' + REDDIT_CLIENT_SECRET).toString('base64')}`
    }

    console.log(headers)

    try {
      const redditResponse = await fetch(url, { method: 'POST', body: postParams, headers })
      if (!redditResponse.ok) {
        console.error('Erro ao obter tokens de acesso do Reddit')
        throw { statusCode: 500 }
      }
      const json = await redditResponse.json()
      const accessToken = json['access_token']
      console.log('accessToken', accessToken)
      response.status(200).json({})
    } catch (err) {
      next(err)
    }
  }
}