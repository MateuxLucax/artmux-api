import { Request, Response, NextFunction } from 'express'
import formidable from 'formidable'
import knex from '../database'
import { Knex } from 'knex'

import crypto from 'crypto'
import { promises as fs } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

import { makeNumberedSlug, makeSlug, parseNumberedSlug } from '../utils/slug'
import { ARTWORK_IMG_DIRECTORY, MAX_SIDE_PX, makeArtworkImgPaths, makeArtworkImgPath } from '../utils/artworkImg'

async function nextSlugnum(knex: Knex, userId: number, slug: string) {
  const currnum = (await
    knex('artworks')
    .select(knex.raw('MAX(slug_num) AS num'))
    .where('slug', slug)
    .andWhere('user_id', userId)
    .first()
  )?.num
  return 1 + (currnum ? Number(currnum) : 0)
}

function artworkImageEndpoint(slug: string, slugnum: number, size: string)  {
  return `/artworks/${makeNumberedSlug(slug, slugnum)}/images/${size}`;
}
export default class ArtworkController {

  static async create(req: Request, res: Response, next: NextFunction) {
    formidable({
      uploadDir: ARTWORK_IMG_DIRECTORY
    })
    .parse(req, async (err, fields, files) => {
      const trx = await knex.transaction()
      try {
        if (err) throw err;

        const missing = [];
        if (!fields.hasOwnProperty('title')) missing.push('title')
        if (!files.hasOwnProperty('image')) missing.push('image')
        const images = [files['image']].flat()
        if (images.length == 0) missing.push('image')
        if (missing.length > 0) {
          throw { statusCode: 400, errorMessage: `Missing ${missing.join(', ')}` }
        }
        
        const userId = req.user.id;
        const title = fields.title as string;
        const observations = fields.observations as string;
        const imageFile = images[0]

        const slug = makeSlug(title)
        const slugnum = await nextSlugnum(trx, userId, slug)
        const fullSlug = makeNumberedSlug(slug, slugnum)

        const [, ext] = /.*\.(.*)/.exec(imageFile.originalFilename ?? '') ?? []
        if (!ext) {
          throw { statusCode: 400, errorMessage: 'Provided file has no extension' }
        }

        // TODO delete the created images if something fails at/after this stage

        const imgPaths = makeArtworkImgPaths(userId, fullSlug, ext)
        await fs.rename(imageFile.filepath, imgPaths.original)

        const asyncExec = promisify(exec)
        const makeMedium =
          `magick '${imgPaths.original}' -resize '${MAX_SIDE_PX.medium}x${MAX_SIDE_PX.medium}>' '${imgPaths.medium}'`
        const makeThumbnail =
          `magick '${imgPaths.original}' -resize '${MAX_SIDE_PX.thumbnail}x${MAX_SIDE_PX.thumbnail}>' '${imgPaths.thumbnail}'`
        const resizeOriginal =
          `magick '${imgPaths.original}' -resize '${MAX_SIDE_PX.original}x${MAX_SIDE_PX.original}>' '${imgPaths.original}'`

        await asyncExec(resizeOriginal)
        await Promise.all([ asyncExec(makeMedium), asyncExec(makeThumbnail) ])

        const artworkUUID = crypto.randomUUID()
        await trx('artworks').insert({
          uuid: artworkUUID,
          slug: slug,
          slug_num: slugnum,
          user_id: userId,
          title: title,
          observations: observations,
          img_path_original: imgPaths.original,
          img_path_medium: imgPaths.medium,
          img_path_thumbnail: imgPaths.thumbnail,
        })

        trx.commit()
        res.status(201).json({ uuid: artworkUUID, slug: fullSlug })
      } catch(err) {
        trx.rollback()
        next(err)
      }
    })
  }

  static async get(req: Request, res: Response) {

    console.log('get artworks')

    // TODO filters!
    // TODO different orders?

    const results = await
      knex('artworks')
      .select(
        'uuid',
        'slug',
        'slug_num',
        'user_id',
        'title',
        'observations',
        'created_at',
        'updated_at',
        'img_path_original',
        'img_path_medium',
        'img_path_thumbnail')
      .where('user_id', req.user.id)
      .orderBy('created_at')

    const works = results.map(work => { return {
      uuid: work.uuid,
      slug: makeNumberedSlug(work.slug, work.slug_num),
      title: work.title,
      observations: work.observations,
      createdAt: work.created_at,
      updatedAt: work.updated_at,
      imagePaths: {
        original: artworkImageEndpoint(work.slug, work.slug_num, 'original'),
        medium: artworkImageEndpoint(work.slug, work.slug_num, 'medium'),
        thumbnail: artworkImageEndpoint(work.slug, work.slug_num, 'thumbnail')
      }
    }})

    res.status(200).json(works)
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    const userId = req.user.id
    const { slug, slugnum } = parseNumberedSlug(req.params.slug)

    const result = await
      knex('artworks')
      .select(
        'uuid',
        'user_id',
        'title',
        'observations',
        'created_at',
        'updated_at',
        'img_path_original',
        'img_path_medium',
        'img_path_thumbnail')
      .where('user_id', userId)
      .andWhere('slug', slug)
      .andWhere('slug_num', slugnum)
      .first()

    if (!result) {
      next({
        statusCode: 404,
        errorMessage: `No artwork found matching user ${userId}, slug ${req.params.slug}`
      })
      return
    }

    res.status(200).json({
      uuid: result.uuid,
      title: result.title,
      observations: result.observations,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      imagePaths: {
        original: artworkImageEndpoint(slug, slugnum, 'original'),
        medium: artworkImageEndpoint(slug, slugnum, 'medium'),
        thumbnail: artworkImageEndpoint(slug, slugnum, 'thumbnail')
      }
    })
  }

  static async getImage(req: Request, res: Response, next: NextFunction) {
    const size = req.params.size
    if (size != 'original' && size != 'medium' && size != 'thumbnail') {
      next({
        statusCode: 400,
        errorMessage: `Invalid image size ${size}`
      })
      return
    }
    const userId = req.user.id
    const { slug, slugnum } = parseNumberedSlug(req.params.slug)
    const col = `img_path_${size}`

    // the only reason we get the path from the database instead of infering it from
    // the slug, user id, etc, is because of the extension
    // TODO use ls to get full path, with extension, then sendFIle
    // (and if you do that, then also remove the img_path_... columns since they'll be useless)
    const result = await
      knex('artworks')
      .select(knex.raw(`${col} AS img_path`))
      .where('user_id', userId)
      .andWhere('slug', slug)
      .andWhere('slug_num', slugnum)
      .first()
    if (!result) {
      next({
        statusCode: 404,
        errorMessage: `No artwork matching user ID ${userId}, slug ${req.params.slug} was found`
      })
      return
    }
    const imgPath = result.img_path;
    try {
      res.sendFile(imgPath)
    } catch(err) {
      next(err)
    }
  }

}