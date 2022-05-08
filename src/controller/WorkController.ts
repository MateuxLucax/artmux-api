import { Request, Response, NextFunction } from 'express'
import formidable from 'formidable'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import knex from '../database'

export default class WorkController {

  static async create(req: Request, res: Response, next: NextFunction) {
    formidable({
      uploadDir: path.resolve('./workimg/')
    })
    .parse(req, async (err, fields, files) => {
      const trx = await knex.transaction()
      try {
        if (err) throw err;

        const missing = [];
        if (!fields.hasOwnProperty('title')) missing.push('title')
        if (!files.hasOwnProperty('image')) missing.push('image')
        if (missing.length > 0) {
          throw { statusCode: 400, message: `Missing fields: ${missing.join(', ')}` }
        }
        
        // TODO change this to req.user.id when it works
        const userId = 1;
        const title = fields.title;
        const observations = fields.observations;
        const imageFile = [files['image']].flat()[0]

        const workUUID = crypto.randomUUID()

        const extExecResult = /.*\.(.*)/.exec(imageFile.originalFilename ?? '') ?? []
        if (extExecResult.length < 2) {
          throw { statusCode: 400, message: 'Provided file has no extension' }
        }
        const ext = extExecResult[1];
        const basePath = path.resolve(`./workimg/${workUUID}`)
        const imgPathOriginal  = `${basePath}_original.${ext}`
        const imgPathMedium    = `${basePath}_medium.${ext}`
        const imgPathThumbnail = `${basePath}_thumbnail.${ext}`

        await fs.rename(imageFile.filepath, `${basePath}_original.${ext}`)
        // TODO resize, save to _medium
        // TODO resize, save to _thumbnail
        // could install imagemagick in the dockerfile and spawn a child process for both

        await trx('works').insert({
          uuid: workUUID,
          user_id: userId,
          title: title,
          observations: observations,
          img_path_original: imgPathOriginal,
          img_path_medium: imgPathMedium,
          img_path_thumbnail: imgPathThumbnail,
        })

        trx.commit()
        res.status(201).json({ uuid: workUUID })
      } catch(err) {
        trx.rollback()
        next(err)
      }
    })
  }

}