import knex from "../database"
import { makeNumberedSlug } from '../utils/slug';
import { Artwork, ArtworkModel } from './ArtworkModel';

export type Publication = {
  id: number,
  title: string,
  text: string,
  slug: string,
  createdAt: Date,
  updatedAt: Date,
  artworks?: Artwork[]
};

export class PublicationModel {

  static fromRow(row: any): Publication {
    return {
      id: row.id,
      title: row.title,
      text: row.text,
      slug: makeNumberedSlug(row.slug_text, row.slug_num),
      artworks: row.artworks ? row.artworks.map((artwork: any) => ArtworkModel.fromRow(artwork)) : [], 
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  static async insertPublicationInSocialMedia(publication_id: number, access_id: number, social_media_id: number) {
    return await knex.table("publication_in_social_media")
      .insert({
        publication_id,
        access_id,
        social_media_id
      })
  }

}