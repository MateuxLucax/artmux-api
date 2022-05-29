import { Request, Response, NextFunction } from 'express';
import knex from '../database';
import { artworkImgEndpoint } from '../utils/artworkImg';
import { makeSlug, makeNumberedSlug, parseNumberedSlug } from '../utils/slug';

export default class PublicationController {

  private static validateCreateBody(body: any) {
    const missing = [];
    if (!body.hasOwnProperty('title') || typeof body.title != 'string') body.title = '';
    if (body.title.trim() == '') missing.push('title');
    if (!body.hasOwnProperty('text') || typeof body.text != 'string') body.text = '';
    if (body.text.trim() == '') missing.push('text');
    if (missing.length > 0) {
      throw { statusCode: 400, errorMessage: `Missing fields: ${missing.join(', ')}`};
    }
    return {
      title: body.title,
      text: body.text,
      artworks: body.artworks ?? []
    };
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    const trx = await knex.transaction();
    try {
      const { title, text, artworks } = PublicationController.validateCreateBody(req.body);

      const slugtext = makeSlug(title);
      const slugnum = await nextPublicationSlugnum(req.user.id, slugtext);
      const slug = makeNumberedSlug(slugtext, slugnum);

      const pubID = await trx
        .into('publications')
        .insert({ title, text, user_id: req.user.id, slug_text: slugtext, slug_num: slugnum })
        .returning('id')
        .then(([{id}]) => id);

      if (artworks.length > 0) {
        await trx.into('publication_has_artworks').insert(
          artworks.map((id: number) => { return {publication_id: pubID, artwork_id: id}; })
        );
      }

      res.status(201).json({ id: pubID, slug });
      trx.commit();
    } catch (err) {
      trx.rollback();
      next(err);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await knex('publications').select('*');
      res.status(200).json(results.map(pub => { return {
        id: pub.id,
        slug: makeNumberedSlug(pub.slug_text, pub.slug_num),
        userId: pub.user_id,
        title: pub.title,
        text: pub.text,
        createdAt: pub.created_at,
        updatedAt: pub.updated_at,
      }}));
    } catch(err) {
      next(err);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    const slug = req.params.slug;
    const { slug: slugtext, slugnum } = parseNumberedSlug(slug);
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
        .first();
      const pub = await pubquery;

      const artquery =
        knex('artworks')
        .select('*')
        .whereIn('id', pub.artwork_ids)
      const artworks = await artquery;

      // TODO probably should start using some kind of ArtworkModel or whatever, would make the stuff below easier

      res.status(200).json({
        id: pub.id,
        title: pub.title,
        text: pub.text,
        createdAt: pub.created_at,
        updatedAt: pub.updated_at,
        artworks: artworks.map(work => { return {
          id: work.id,
          slug: makeNumberedSlug(work.slug, work.slug_num),
          title: work.title,
          observations: work.observations,
          createdAt: work.created_at,
          updatedAt: work.updated_at,
          imagePaths: {
            original: artworkImgEndpoint(work.slug, work.slug_num, 'original'),
            medium: artworkImgEndpoint(work.slug, work.slug_num, 'medium'),
            thumbnail: artworkImgEndpoint(work.slug, work.slug_num, 'thumbnail')
          }
        }})
      });
    } catch(err) {
      next(err);
    }
  }

}

async function nextPublicationSlugnum(userid: number, slugtext: string) {
  const query =
    knex('publications')
    .where('user_id', userid)
    .andWhere('slug_text', slugtext)
    .select(knex.raw('MAX(slug_num) AS num'))
    .first();
  const currnum = (await query)?.num;
  return 1 + (currnum ? Number(currnum) : 0);
}