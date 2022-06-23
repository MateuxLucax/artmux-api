import { artworkImgEndpoint } from "../utils/artworkImg";
import { makeNumberedSlug, parseNumberedSlug } from "../utils/slug";
import { Knex } from 'knex';
import { SearchParams, addFilters, FilterApplier } from "../utils/search";
import { Publication, PublicationModel } from "./PublicationModel";
import { Tag, TagModel } from "./TagModel";

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
  tags?: Tag[],
  publications?: Publication[]
};

export class ArtworkModel {

  static fromRow(row: any): Artwork {
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
      tags: row.tags ? row.tags.map((tag: any) => TagModel.fromRow(tag)) : [], 
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
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

  static async adjoinPublications(knex: Knex, artwork: Artwork): Promise<void> {
    const query =
      knex({pa: 'publication_has_artworks'})
      .join({p: 'publications'}, 'p.id', 'pa.publication_id')
      .where('pa.artwork_id', artwork.id)
      .select('p.*');
    const rows = await query;
    artwork.publications = rows.map(PublicationModel.fromRow);
  }

  static async search(knex: Knex, params: SearchParams): Promise<{ artworks: Artwork[], total: number }> {
    // TODO: improve this
    params.order = `artworks.${params.order}`;
    params.filters.map(filter => `artworks.${filter.name}`);

    const query =
      knex('artworks')
      .select(
        'artworks.*', 
        knex.raw('COUNT(*) OVER() AS total'),
        knex.raw('JSONB_AGG(tags.*) AS tags')
      )
      .join('artwork_has_tags', 'artwork_has_tags.artwork_id', '=', 'artworks.id')
      .join('tags', 'tags.id', '=', 'artwork_has_tags.artwork_id')
      .where('artworks.user_id', params.userid)
      .orderBy([{ column: params.order, order: params.direction }])
      .limit(params.perPage)
      .groupBy('artworks.id')
      .offset((params.page - 1) * params.perPage);
    addFilters(query, params.filters, artworkOperatorTable);
    const rows = await query;
    const total = rows.length > 0 ? rows[0].total : 0;
    const artworks = rows.map(this.fromRow);
    return { artworks, total };
  }

}

const artworkOperatorTable = new Map<string, FilterApplier>();

artworkOperatorTable.set('tagsAnyOf', (qry, col, val) => {
  qry.orWhereExists(function() {
    this.select('tag_id')
        .from('artwork_has_tags')
        .whereIn('tag_id', val)
        .andWhereRaw('artwork_id = artworks.id');
  })
});

artworkOperatorTable.set('tagsAllOf', (qry, col, val) => {
  qry.orWhereRaw(`NOT EXISTS(
    SELECT * FROM (VALUES ${val.map((t:number) => '(' + t + ')').join(',')}) T
    EXCEPT
    SELECT tag_id FROM artwork_has_tags WHERE artwork_id = artworks.id
  )`);
});