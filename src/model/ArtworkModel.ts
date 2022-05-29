import { artworkImgEndpoint } from "../utils/artworkImg";
import { makeNumberedSlug, parseNumberedSlug } from "../utils/slug";
import { Knex } from 'knex';
import { Filter, addFilters } from "../utils/queryFilters";

export type Tag = {
  id?: number,
  name: string
};

export type Artwork = {
  id: number,
  slug: string,
  title: string,
  observations?: string,
  imagePaths: {
    original: string,
    medium: string,
    thumbnail: string,
  },
  createdAt: Date,
  updatedAt: Date,
  tags?: Tag[]
};

export type SearchParams = {
  userid: number,
  page: number,
  perPage: number,
  order: string,
  direction: string,
  filters: Filter[]
}

export class ArtworkModel {

  private static fromRow(row: any): Artwork {
    return {
      id: row.id,
      slug: makeNumberedSlug(row.slug, row.slug_num),
      title: row.title,
      observations: row.observations,
      imagePaths: {
        original: artworkImgEndpoint(row.slug, row.slug_num, 'original'),
        medium: artworkImgEndpoint(row.slug, row.slug_num, 'medium'),
        thumbnail: artworkImgEndpoint(row.slug, row.slug_num, 'thumbnail'),
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static async findById(knex: Knex, ids: number[]): Promise<Artwork[]> {
    const query =
      knex('artworks')
      .whereIn('id', ids)
      .select('*');
    const rows = await query;
    return rows.map(this.fromRow);
  }

  static async findBySlug(knex: Knex, userid: number, slugfull: string): Promise<Artwork | null> {
    const { slug, slugnum } = parseNumberedSlug(slugfull);
    const query =
      knex('artworks')
      .where('user_id', userid)
      .andWhere('slug', slug)
      .andWhere('slug_num', slugnum)
      .select('*')
      .first();
    const row = await query;
    return row == undefined ? null : this.fromRow(row);
  }

  static async adjoinTags(knex: Knex, artwork: Artwork): Promise<void> {
    const query =
      knex({at: 'artwork_has_tags'})
      .join({t: 'tags'}, 't.id', 'at.tag_id')
      .where('at.artwork_id', artwork.id)
      .select('t.id', 't.name');
    const rows = await query;
    artwork.tags = rows;
  }

  static async search(knex: Knex, params: SearchParams): Promise<{ artworks: Artwork[], total: number }> {
    const query =
      knex('artworks')
      .select('*', knex.raw('COUNT(*) OVER() AS total'))
      .where('user_id', params.userid)
      .orderBy([{ column: params.order, order: params.direction }])
      .limit(params.perPage)
      .offset((params.page - 1) * params.perPage);
    addFilters(query, params.filters);
    const rows = await query;
    const total = rows.length > 0 ? rows[0].total : 0;
    const artworks = rows.map(this.fromRow);
    return { artworks, total };
  }

}