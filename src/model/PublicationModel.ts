import { makeNumberedSlug } from '../utils/slug';
import { Artwork } from './ArtworkModel';

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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

}