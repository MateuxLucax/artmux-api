import { Request, Response, NextFunction } from 'express'
import { Knex } from 'knex'
import knex from '../database'
import { ArtworkModel } from '../model/ArtworkModel'
import { makeSlug, makeNumberedSlug, parseNumberedSlug } from '../utils/slug'
import { PublicationModel } from '../model/PublicationModel'
import { validateSearchParams, addFilters, SearchParams } from "../utils/search"
import SocialMediaService from '../services/SocialMediaService'

//* Publications can be created/updated/deleted without actually being published in any platform
//* There'll be a separate "publish" action for that later

async function addArtworksToPublication(knex: Knex, pubID: number, artworkIDs: number[]) {
  if (artworkIDs.length == 0) return
  await knex('publication_has_artworks').insert(
    artworkIDs.map((id: number) => { return {publication_id: pubID, artwork_id: id} })
  )
}

async function nextPublicationSlugnum(knex: Knex, userid: number, slugtext: string) {
  const query =
    knex('publications')
    .where('user_id', userid)
    .andWhere('slug_text', slugtext)
    .select(knex.raw('MAX(slug_num) AS num'))
    .first()
  const currnum = (await query)?.num
  return 1 + (currnum ? Number(currnum) : 0)
}

export default class PublicationController {

  private static validateCreateBody(body: any) {
    const missing = []
    if (!body.hasOwnProperty('title') || typeof body.title != 'string') body.title = ''
    if (body.title.trim() == '') missing.push('title')
    if (!body.hasOwnProperty('text') || typeof body.text != 'string') body.text = ''
    if (body.text.trim() == '') missing.push('text')
    if (missing.length > 0) {
      throw { statusCode: 400, errorMessage: `Missing fields: ${missing.join(', ')}`}
    }
    return {
      title: body.title,
      text: body.text,
      artworkIDs: body.artworks ?? []
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    const trx = await knex.transaction()
    try {
      const { title, text, artworkIDs } = PublicationController.validateCreateBody(req.body)

      const slugtext = makeSlug(title)
      const slugnum = await nextPublicationSlugnum(trx, req.user.id, slugtext)
      const slug = makeNumberedSlug(slugtext, slugnum)

      const pubID = await trx('publications')
        .insert({ title, text, user_id: req.user.id, slug_text: slugtext, slug_num: slugnum })
        .returning('id')
        .then(([{id}]) => id)

      await addArtworksToPublication(trx, pubID, artworkIDs)

      trx.commit()
      res.status(201).json({ id: pubID, slug })
    } catch (err) {
      trx.rollback()
      next(err)
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    const oldSlug = req.params.slug
    const { slug: oldSlugText, slugnum: oldSlugNum } = parseNumberedSlug(oldSlug)
    const userid = req.user.id
    const trx = await knex.transaction()

    try {
      const { title, text, artworkIDs } = PublicationController.validateCreateBody(req.body)

      let updateObj: any = { title, text, updated_at: trx.raw('CURRENT_TIMESTAMP') }

      const slugText = makeSlug(title)
      let slugNum = oldSlugNum
      if (oldSlugText != slugText) {
        slugNum = await nextPublicationSlugnum(trx, userid, slugText)
        updateObj.slug_text = slugText
        updateObj.slug_num = slugNum
      }

      const pubID = await trx('publications')
        .where('user_id', userid).andWhere('slug_text', oldSlugText).andWhere('slug_num', oldSlugNum)
        .update(updateObj)
        .returning('id')
        .then(([{id}]) => id)

      await trx('publication_has_artworks').where('publication_id', pubID).delete()
      await addArtworksToPublication(trx, pubID, artworkIDs)

      trx.commit()
      res.status(200).json({ slug: makeNumberedSlug(slugText, slugNum) })
    } catch (err) {
      trx.rollback()
      next(err)
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    const slug = req.params.slug
    const { slug: slugtext, slugnum } = parseNumberedSlug(slug)
    try {
      await knex('publications')
        .where('user_id', req.user.id)
        .andWhere('slug_text', slugtext)
        .andWhere('slug_num', slugnum)
        .delete()
      res.status(204).end()
    } catch(err) {
      next(err)
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {

    const validation = validateSearchParams(req, ['created_at', 'updated_at', 'title', 'text'])
    if (typeof validation == 'string') {
      next({ statusCode: 400, errorMessage: validation as string })
      return
    }
    let params = validation as SearchParams
    // TODO: improve this
    params.order = `publications.${params.order}`
    params.filters.map(filter => `publications.${filter.name}`)

    // TODO: return only the first artwork
    try {
      const query =
        knex('publications')
        .select(
          'publications.*',
          knex.raw('JSONB_AGG(artworks.*) AS artworks'),
          knex.raw('COUNT(publications.id) OVER() AS total')
        )
        .join('publication_has_artworks', 'publication_has_artworks.publication_id', '=', 'publications.id')
        .join('artworks', 'artworks.id', '=', 'publication_has_artworks.artwork_id')
        .limit(params.perPage)
        .offset((params.page - 1) * params.perPage)
        .groupBy('publications.id')
        .orderBy([{ column: params.order, order: params.direction }])
      try {
        addFilters(query, params.filters)
      } catch (msg) {
        throw { statusCode: 400, errorMessage: msg }
      }
      const rows = await query
      const publications = await Promise.all(rows.map(async row => {
        const pub: any = PublicationModel.fromRow(row)
        pub.createdAt = pub.createdAt.toISOString()
        pub.updatedAt = pub.updatedAt.toISOString()

        pub.socialMedias = await PublicationModel.publishedAtSocialMedia(pub.id)
        return pub
      }))
      const total = rows.length > 0 ? rows[0].total : 0
      res.status(200).json({ publications, total })
    } catch(err) {
      next(err)
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    const slug = req.params.slug
    const { slug: slugtext, slugnum } = parseNumberedSlug(slug)
    try {
      const pubquery = 
        knex({p: 'publications'})
        .leftJoin({pa: 'publication_has_artworks'}, 'pa.publication_id', 'p.id')
        .where('user_id', req.user.id)
        .andWhere('slug_text', slugtext)
        .andWhere('slug_num', slugnum)
        .select(
          'p.id', 'p.title', 'p.text', 'p.created_at', 'p.updated_at',
          knex.raw('jsonb_agg(pa.artwork_id) AS artwork_ids'))
        .groupBy('p.id')
        .first()
      const pub = await pubquery

      if (pub == undefined) throw {
        statusCode: 404,
        errorMessage: `No publication found matching user ${req.user.id}, slug ${slug}`
      }

      const artworks = await ArtworkModel.findById(knex, pub.artwork_ids ?? [])
      await Promise.all(artworks.map(a => ArtworkModel.adjoinTags(knex, a)))

      res.status(200).json({
        id: pub.id,
        slug,
        title: pub.title,
        text: pub.text,
        createdAt: pub.created_at,
        updatedAt: pub.updated_at,
        artworks
      })
    } catch(err) {
      next(err)
    }
  }

  static async publish(request: Request, response: Response) {
    try {
      const { socialMediaId } = request.body

      const callback = SocialMediaService.publish.get(Number(socialMediaId))

      if (callback) await callback(request, response)
      else response.status(400).json({ message: "Não foi possível obter a rede social." })
    } catch (_) {
      response.status(400).json({ message: "Não foi possível fazer a publicação." })
    }
  }

  static async published(request: Request, response: Response) {
    try {
      const publicationId = Number(request.params.id)

      const publishedAt = await PublicationModel.publishedAt(publicationId)

      response.json({ publishedAt })
    } catch (_) {
      response.status(400).json({ message: "Não foi possível obter informações sobre a publicação." })
    }
  }
}
