import { Request, Response, NextFunction } from 'express'
import formidable from 'formidable'
import knex from '../database'
import { Knex } from 'knex'

import { makeSlug, makeNumberedSlug, parseNumberedSlug } from '../utils/slug'
import { makeArtworkImgPaths, ARTWORK_IMG_DIRECTORY, ArtworkImageTransaction, getArtworkImgPaths, artworkImgEndpoint } from '../utils/artworkImg'
import { ArtworkModel } from '../model/ArtworkModel'


//* We could refactor the controller and the model further so
//* the controller never interacts directly with the database,
//* but always indirectly using the model.

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
        //! Not as trivial to do something like validateCreateBody here, because we need to imgtrx.setUploadedFile before throwing. Better not to do it at all.

        if (missing.length > 0) {
          throw { statusCode: 400, errorMessage: `Missing ${missing.join(', ')}` }
        }
        
        const userId = req.user.id;
        const title = fields.title as string;
        const observations = fields.observations as string;

        let tags;
        const tagsJSON = fields.tags as string;
        try {
          tags = JSON.parse(tagsJSON);
        } catch(err) {
          throw { statusCode: 400, errorMessage: `Malformed tags, could not parse JSON: ${tagsJSON}`}
        }

        const slug = makeSlug(title)
        const slugnum = await nextArtworkSlugnum(trx, userId, slug)
        const slugfull = makeNumberedSlug(slug, slugnum)

        const [, ext] = /.*\.(.*)/.exec(images[0].originalFilename ?? '') ?? []
        if (!ext) {
          throw { statusCode: 400, errorMessage: 'Provided file has no extension' }
        }

        const imgPaths = makeArtworkImgPaths(userId, slugfull, ext)
        await imgtrx.create(imgPaths)

        const artworkID = await
          trx('artworks')
          .insert({
            slug: slug,
            slug_num: slugnum,
            user_id: userId,
            title: title,
            observations: observations,
            img_path_original: imgPaths.original,
            img_path_medium: imgPaths.medium,
            img_path_thumbnail: imgPaths.thumbnail,
          })
          .returning('id')
          .then(([{id}]) => id);

        await tagArtwork(trx, userId, artworkID, tags);

        trx.commit()
        res.status(201).json({ id: artworkID, slug: slugfull })
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

        const tagsJSON = fields['tags'] as string;
        let tags;
        try {
          tags = JSON.parse(tagsJSON);
        } catch(err) {
          throw { statusCode: 400, errorMessage: `Malformed tags, could not parse JSON: ${tags}` };
        }

        const oldwork = await
          knexArtworkBySlug(trx, userid, oldslug, oldslugnum)
          .select('id', 'title', 'img_path_original', 'img_path_medium', 'img_path_thumbnail')
          .first();

        const id = oldwork.id;

        const newslug = makeSlug(title)
        const slugChanged = oldslug != newslug;
        const newslugnum = slugChanged ? await nextArtworkSlugnum(trx, userid, newslug) : oldslugnum;
        const newslugfull = makeNumberedSlug(newslug, newslugnum)

        const updateObject = {
          slug: newslug,
          slug_num: newslugnum,
          title: title,
          observations: observations,
          updated_at: trx.raw('CURRENT_TIMESTAMP')
        }

        const oldPaths = {
          original: oldwork.img_path_original,
          medium: oldwork.img_path_medium,
          thumbnail: oldwork.img_path_thumbnail,
        }

        if (images.length > 0 && images[0] != undefined) {
          // The user changed the artwork image
          imgtrx.setUploadedFile(images[0].filepath)

          const [, ext] = /.*\.(.*)/.exec(images[0].originalFilename ?? '') ?? []
          if (!ext) throw { statusCode: 400, errorMessage: 'Extensionless file' }
          await imgtrx.delete(Object.values(oldPaths))

          const paths = makeArtworkImgPaths(userid, newslugfull, ext)
          await imgtrx.create(paths)

          Object.assign(updateObject, {
            img_path_original: paths.original,
            img_path_medium: paths.medium,
            img_path_thumbnail: paths.thumbnail,
          })
        } else if (slugChanged) {
          // The user didn't change the artwork image, but still changed the title
          // so we need to update the image names accordingly
          const [, ext] = /.*\.(.*)/.exec(oldPaths.original) ?? []
          const paths = makeArtworkImgPaths(userid, newslugfull, ext)
          await imgtrx.rename(oldPaths, paths)

          Object.assign(updateObject, {
            img_path_original: paths.original,
            img_path_medium: paths.medium,
            img_path_thumbnail: paths.thumbnail,
          })
        }

        await trx('artworks').where('id', id).update(updateObject);
        await untagArtwork(trx, id);  // remove old tags
        await tagArtwork(trx, userid, id, tags);  // add new tags

        trx.commit()
        res.status(200).json({ slug: newslugfull })
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
      await knexArtworkBySlug(trx, userid, slug, slugnum).delete();
      await getArtworkImgPaths(userid, slugfull)
        .then(paths => imgtrx.delete(Object.values(paths)))
        .catch(console.error);  // If the paths don't exist, fine
      trx.commit()
      res.status(204).end()
    } catch(err) {
      trx.rollback()
      imgtrx.rollback()
      next(err)
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {

    const order = req.query.order as string
    const direction = req.query.direction as string
    const page = Number(req.query.page)
    const perPage = Number(req.query.perPage)

    let filters = [];
    try {
      const filterArray = [req.query.filters ?? []].flat() as string[];
      filters = filterArray.map(x => JSON.parse(x));
    } catch(err) {
      next({ statusCode: 400, errorMessage: 'Malformed filters, could not parse as JSON' });
    }

    if (page <= 0) next({ statusCode: 400, errorMessage: 'Page must be non-negative' });
    if (perPage <= 0) next({ statusCode: 400, errorMessage: 'Works per page must be non-negative' });
    
    const orderSupportedFields = ['created_at', 'updated_at', 'title'];
    if (!orderSupportedFields.includes(order)) next({
      statusCode: 400,
      errorMessage: `'order' must have one of these values: ${orderSupportedFields.join(', ')}`
    });

    if (direction != 'asc' && direction != 'desc') next({
      statusCode: 400,
      errorMessage: `'direction' must be 'asc' or 'desc'`
    });

    const params = {
      userid: req.user.id,
      page, perPage, order, direction, filters
    };

    try {
      const { total, artworks } = await ArtworkModel.search(knex, params);
      res.status(200).json({ total, artworks })
    } catch(err) {
      next(err);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    const alsoWith = (req.query.with as string ?? '').split(',');
    const artwork = await ArtworkModel.findBySlug(knex, req.user.id, req.params.slug)
    if (artwork != null) {
      await ArtworkModel.adjoinTags(knex, artwork);
      if (alsoWith.includes('publications')) {
        await ArtworkModel.adjoinPublications(knex, artwork);
      }
      res.status(200).json(artwork);
    } else {
      next({ statusCode: 404, errorMessage: `No artwork found matching user ${req.user.id}, slug ${req.params.slug}`});
    }
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

  static async getAllTags(req: Request, res: Response, next: NextFunction) {
    try {
      const query = knex('tags').select('id', 'name').where('user_id', req.user.id);
      const tags = (await query).map(x => { return { id: Number(x.id), name: x.name }; })
      res.status(200).json(tags);
    } catch(err) {
      next(err);
    }
  }

}


// TODO delete at some point
function knexArtworkBySlug(knex: Knex, userid: number, slug: string, slugnum: number) {
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


type Tag = {
  name: string,
  id?: number
};

async function untagArtwork(knex: Knex, artworkID: number) {
  await knex('artwork_has_tags').where('artwork_id', artworkID).delete();
}

async function tagArtwork(knex: Knex, userID: number, artworkID: number, tags: Tag[]) {
  const tagIds = await Promise.all(tags.map(tag => {
    if ('id' in tag) return tag.id;
    return knex.into('tags')
               .insert({ user_id: userID, name: tag.name })
               .returning('id')
               .then(([{id}]) => id)
  }));
  await knex.into('artwork_has_tags')
            .insert(tagIds.map(id => { return { artwork_id: artworkID, tag_id: id }; }));
}