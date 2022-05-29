





// TODO actually use slugs for publications, and make titles mandatory
// (actually don't make them mandatory but in the database, then use 'untitled' for when the title is not informed
// probably should do the same thing for artowkrs!)
// the titles are not necessarely the social network titles
// they're for the user to have something to identify each publication
// but they CAN be the social networks titles if the user wants to





import { Request, Response, NextFunction } from 'express';
import knex from '../database';
import { makeNumberedSlug } from '../utils/slug';

export default class PublicationController {

  static async create(req: Request, res: Response, next: NextFunction) {
    const trx = await knex.transaction();
    try {

      if (!req.body.hasOwnProperty('text') || typeof req.body.text != 'string') {
        throw { statusCode: 400, errorMessage: 'Missing field text' };
      }

      const title = req.body.title.trim();
      const text = req.body.text.trim();
      const artworks = req.body.artworks ?? [];

      const pubID = await trx
        .into('publications')
        .insert({ title, text, user_id: req.user.id })
        .returning('id')
        .then(([{id}]) => id);

      await trx.into('publication_has_artworks').insert(
        artworks.map((id: number) => { return {publication_id: pubID, artwork_id: id}; })
      );

      res.status(201).json({ id: pubID });
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

  static async getById(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id;
    try {
      const pubquery = 
        knex({p: 'publications'})
        .leftJoin({pa: 'publication_has_artworks'}, 'pa.publication_id', 'p.id')
        .where('userid', id)
        .select(
          'p.id', 'p.title', 'p.text', 'p.created_at', 'p.updated_at',
          knex.raw('jsonb_agg(pa.artwork_id) AS artworks'))
        .groupBy('p.id')
        .first();
      const pub = await pubquery;

      const artquery =
        knex('artworks')
        .select('*')
        .whereIn('id', pub.artworks)
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
            thumbnail: work.img_path_thumbnail,
            medium: work.img_path_medium,
            original: work.img_path_original,
          }
        }})
      });
    } catch(err) {
      next(err);
    }
  }

}