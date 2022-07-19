import { Request, Response, NextFunction } from 'express'
import { CreateAccountFromSocialMedia } from "../services/SocialMediaService"
import { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET } from '../utils/environmentUtil'
import { RedditAccess } from '../model/RedditModel'
import Snoowrap from 'snoowrap'
import CryptoUtil from '../utils/CryptoUtil'
import { randomBytes } from 'crypto'
import RedditModel from '../model/RedditModel'
import AccessModel from '../model/AccessModel'

// Configurada no reddit.com/prefs/apps
const redirectUri = 'https://artmux.gargantua.one/perfil/reddit_redirect_uri.php'

function makeSnoowrap(accessToken: string) {
  return new Snoowrap({
    userAgent: 'node:artmux:1.0.0 (by /u/artmux)',
    accessToken,
    clientId: REDDIT_CLIENT_ID,
    clientSecret: REDDIT_CLIENT_SECRET
  })
}

export default class RedditController
implements
CreateAccountFromSocialMedia
{
  async createAccount(request: Request, response: Response): Promise<void> {
    const redirect = Snoowrap.getAuthUrl({
      clientId: REDDIT_CLIENT_ID,
      scope: ['identity', 'submit'],
      redirectUri
    })
    response.status(200).json({ redirect })
  }

  static async callback(request: Request, response: Response, next: NextFunction): Promise<void> {
    const { code } = request.body
    const url = 'https://www.reddit.com/api/v1/access_token'
    const postParams = new URLSearchParams()
    postParams.set('grant_type', 'authorization_code')
    postParams.set('code', code)
    postParams.set('redirect_uri', redirectUri)

    const headers = {
      'Authorization': `Basic ${Buffer.from(REDDIT_CLIENT_ID + ':' + REDDIT_CLIENT_SECRET).toString('base64')}`
    }

    try {
      const redditResponse = await fetch(url, { method: 'POST', body: postParams, headers })
      if (!redditResponse.ok) {
        throw { statusCode: 500, errorMessage: 'Erro ao obter tokens de acesso do Reddit' }
      }
      const json = await redditResponse.json()
      const accessToken = json['access_token']

      const snoo = makeSnoowrap(accessToken)
      await snoo.getMe().then(async me => {
        const salt = randomBytes(16).toString('base64')
        const key = CryptoUtil.createKey(salt)
        const data: RedditAccess = {
          accessToken: CryptoUtil.encrypt(accessToken, key),
          userName: CryptoUtil.encrypt(me.name, key),
          userId: CryptoUtil.encrypt(me.id, key)
        }
        if (await RedditModel.insertAccess(request.user.id, salt, data)) {
          response.status(200).json({})
        } else {
          throw { statusCode: 500, errorMessage: 'Could not insert Reddit access into database' }
        }
      })
    } catch (err) {
      next(err)
    }
  }

  async removeAccount(request: Request, response: Response, next: NextFunction) {
    const accessId = Number(request.params.id)
    const userId   = request.user.id

    try {
      const removed = await AccessModel.remove(accessId, userId)
      if (removed) {
        response.json({
          message: 'Acesso removido do nosso banco de dados. Clique em "ok" para ser direcionado a página do Reddit onde o acesso do artmux pode ser revogado.',
          redirect: 'https://www.reddit.com/prefs/apps'
        })
      } else {
        response.status(200).json({ message: 'Não foi possível revogar o seu acesso' })
      }
    } catch(err) {
      next(err)
    }
  }
}