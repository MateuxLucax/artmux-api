import { Request, Response, NextFunction } from 'express'
import formidable from 'formidable'
import knex from '../database'
import { Knex } from 'knex'

import crypto from 'crypto'
import { promises as fs } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

import { makeNumberedSlug, makeSlug, parseNumberedSlug } from '../utils/slug'
import { makeArtworkImgPaths, ARTWORK_IMG_DIRECTORY, ArtworkImageTransaction } from '../utils/artworkImg'

async function nextArtworkSlugnum(knex: Knex, userId: number, slug: string) {
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
      const imgtrx = new ArtworkImageTransaction()

      try {
        if (err) throw err;

        const missing = [];
        if (!fields.hasOwnProperty('title')) missing.push('title')
        if (!files.hasOwnProperty('image')) missing.push('image')
        const images = [files['image']].flat() // files['image'] is a File | File[]

        if (images.length == 0){
          missing.push('image')
        } else {
          imgtrx.setUploadedFile(images[0].filepath)
        }

        if (missing.length > 0) {
          throw { statusCode: 400, errorMessage: `Missing ${missing.join(', ')}` }
        }
        
        const userId = req.user.id;
        const title = fields.title as string;
        const observations = fields.observations as string;

        const slug = makeSlug(title)
        const slugnum = await nextArtworkSlugnum(trx, userId, slug)
        const slugfull = makeNumberedSlug(slug, slugnum)

        const [, ext] = /.*\.(.*)/.exec(images[0].originalFilename ?? '') ?? []
        if (!ext) {
          throw { statusCode: 400, errorMessage: 'Provided file has no extension' }
        }

        const imgPaths = makeArtworkImgPaths(userId, slugfull, ext)
        await imgtrx.create(imgPaths)

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
        res.status(201).json({ uuid: artworkUUID, slug: slugfull })
      } catch(err) {
        trx.rollback()
        await imgtrx.rollback()
        next(err)
      }
    })
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    const userid = req.user.id
    const oldslugfull = req.params.slug
    const { slug: oldslug, slugnum: oldslugnum } = parseNumberedSlug(oldslugfull)

    formidable({ uploadDir: ARTWORK_IMG_DIRECTORY })
    .parse(req, async (err, fields, files) => {

      const trx = await knex.transaction()
      const imgtrx = new ArtworkImageTransaction()

      try {
        if (err) throw err;

        if (!fields.hasOwnProperty('title')) { // Only required field
          throw { statusCode: 400, errorMessage: 'Missing title'}
        }
        const title = fields['title'] as string
        const observations = fields['observations'] as string
        const images = [files['image']].flat()

        const oldwork = await
          knex('artworks')
          .where('user_id', userid)
          .andWhere('slug', oldslug)
          .andWhere('slug_num', oldslugnum)
          .select('title', 'img_path_original', 'img_path_medium', 'img_path_thumbnail')
          .first()

        const slug = makeSlug(title)
        const slugChanged = oldslug != slug;
          
        const slugnum = slugChanged ? await nextArtworkSlugnum(trx, userid, slug) : oldslugnum;
        const slugfull = makeNumberedSlug(slug, slugnum)

        const updateObject = {
          slug: slug,
          slug_num: slugnum,
          title: title,
          observations: observations,
          updated_at: (new Date()).toISOString()
        }

        const oldPaths = {
          original: oldwork.img_path_original,
          medium: oldwork.img_path_medium,
          thumbnail: oldwork.img_path_thumbnail,
        }

        if (images.length > 0 && images[0] != undefined) {
          imgtrx.setUploadedFile(images[0].filepath)

          const [, ext] = /.*\.(.*)/.exec(images[0].originalFilename ?? '') ?? []
          if (!ext) throw { statusCode: 400, errorMessage: 'Extensionless file' }
          await imgtrx.delete(oldPaths)

          const paths = makeArtworkImgPaths(userid, slugfull, ext)
          await imgtrx.create(paths)

          Object.assign(updateObject, {
            img_path_original: paths.original,
            img_path_medium: paths.medium,
            img_path_thumbnail: paths.thumbnail,
          })
        } else if (slugChanged) {
          const [, ext] = /.*\.(.*)/.exec(oldPaths.original) ?? []
          const paths = makeArtworkImgPaths(userid, slugfull, ext)
          await imgtrx.rename(oldPaths, paths)

          Object.assign(updateObject, {
            img_path_original: paths.original,
            img_path_medium: paths.medium,
            img_path_thumbnail: paths.thumbnail,
          })
        }

        await knex('artworks')
          .where('user_id', userid)
          .andWhere('slug', oldslug)
          .andWhere('slug_num', oldslugnum)
          .update(updateObject);

        trx.commit()
      } catch (err) {
        trx.rollback()
        imgtrx.rollback()
        next(err)
      }
    })
  }

  static async get(req: Request, res: Response) {

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
    // (and if you do that, then also remove the img_path_... columns from the artworks table since they'll be useless)
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
      next({ statusCode: 404, errorMessage: 'Image does not exist' })
    }
  }

}