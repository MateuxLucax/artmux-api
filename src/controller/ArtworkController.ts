import { Request, Response, NextFunction } from 'express'
import formidable from 'formidable'
import knex from '../database'
import { Knex } from 'knex'

import crypto from 'crypto'

import { makeSlug, makeNumberedSlug, parseNumberedSlug } from '../utils/slug'
import { makeArtworkImgPaths, ARTWORK_IMG_DIRECTORY, ArtworkImageTransaction, getArtworkImgPaths } from '../utils/artworkImg'
import { addFilters } from '../utils/queryFilters'

export default class ArtworkController {

  static async create(req: Request, res: Response, next: NextFunction) {
    formidable({ uploadDir: ARTWORK_IMG_DIRECTORY })
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
          knexArtwork(userid, oldslug, oldslugnum)
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
          await imgtrx.delete(Object.values(oldPaths))

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

        await knexArtwork(userid, oldslug, oldslugnum).update(updateObject);

        trx.commit()
        res.status(200).json({ slug: slugfull })
      } catch (err) {
        trx.rollback()
        imgtrx.rollback()
        next(err)
      }
    })
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    const userid = req.user.id
    const slugfull = req.params.slug
    const { slug, slugnum } = parseNumberedSlug(slugfull)

    const trx = await knex.transaction()
    const imgtrx = new ArtworkImageTransaction()
    try {
      await Promise.all([
        getArtworkImgPaths(userid, slugfull)
        .then(paths => imgtrx.delete(Object.values(paths)))
        .catch(console.error),  // If the paths don't exist, fine

        knexArtwork(userid, slug, slugnum).delete()
      ])
      trx.commit()
      res.status(204).end()
    } catch(err) {
      trx.rollback()
      imgtrx.rollback()
      next(err)
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {

    const field = req.query.order as string
    const order = req.query.direction as string
    const page = Number(req.query.page)
    const perPage = Number(req.query.perPage)

    let filters = [];
    try {
      const filterArray = [req.query.filters ?? []].flat() as string[];
      filters = (filterArray).map(x => JSON.parse(x));
    } catch(err) {
      next({ statusCode: 400, errorMessage: 'Malformed filters, could not parse as JSON' });
    }

    // for now field = column in the table
    // but it won't be that way when we start supporting tags

    if (page <= 0) next({ statusCode: 400, errorMessage: 'Page must be non-negative' });
    if (perPage <= 0) next({ statusCode: 400, errorMessage: 'Works per page must be non-negative' });
    
    const orderSupportedFields = ['created_at', 'updated_at', 'title'];
    if (!orderSupportedFields.includes(field)) next({
      statusCode: 400,
      errorMessage: `'order' must have one of these values: ${orderSupportedFields.join(', ')}`
    });

    if (order != 'asc' && order != 'desc') next({
      statusCode: 400,
      errorMessage: `'direction' must be 'asc' or 'desc'`
    });

    try {
      const query =
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
          'img_path_thumbnail',
          knex.raw('COUNT(*) OVER() AS total_works'))
        .where('user_id', req.user.id)
        .orderBy([{ column: field, order }])
        .limit(perPage)
        .offset((page - 1) * perPage);

      addFilters(query, filters);

      const results = await query;

      const totalWorks = results.length > 0 ? results[0].total_works : 0;

      const works = results.map(work => { return {
        uuid: work.uuid,
        slug: makeNumberedSlug(work.slug, work.slug_num),
        title: work.title,
        observations: work.observations,
        createdAt: work.created_at,
        updatedAt: work.updated_at,
        imagePaths: {
          original: artworkImgEndpoint(work.slug, work.slug_num, 'original'),
          medium: artworkImgEndpoint(work.slug, work.slug_num, 'medium'),
          thumbnail: artworkImgEndpoint(work.slug, work.slug_num, 'thumbnail')
        },
      }});

      res.status(200).json({ totalWorks, works })
    } catch(err) {
      next(err);
    }
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
        original: artworkImgEndpoint(slug, slugnum, 'original'),
        medium: artworkImgEndpoint(slug, slugnum, 'medium'),
        thumbnail: artworkImgEndpoint(slug, slugnum, 'thumbnail')
      },
      editable: true 
      // TODO artork editable iff there exists no publication for which an actual social media post has been made
      //   to implement that, make a function that will add the joins and columns to the query builder
      //   so it can be easily reused without replicating this logic in each case 
      //   (we'll use not only to tell the client that it's not editable, so it can disable the edit/delete buttons,
      //   but also for verifying in the update and delete endpoints)
      //   [not a boolean function that does the query because then it's one extra database query,
      //   whereas with this approach we only do one query; more efficient]
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

    try {
      const paths = await getArtworkImgPaths(userId, req.params.slug)
      const path = paths[size];
      res.sendFile(path)
    } catch(err) {
      next({ statusCode: 404, errorMessage: 'Image does not exist' })
    }
  }

}


function knexArtwork(userid: number, slug: string, slugnum: number) {
  return knex('artworks')
    .where('user_id', userid)
    .andWhere('slug', slug)
    .andWhere('slug_num', slugnum)
}


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


function artworkImgEndpoint(slug: string, slugnum: number, size: string)  {
  return `/artworks/${makeNumberedSlug(slug, slugnum)}/images/${size}`;
}