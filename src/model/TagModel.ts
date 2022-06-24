import knex from "../database";
import { Artwork, ArtworkModel } from "./ArtworkModel";

export type ITag = {
  id?: number,
  name: string,
  artworks?: Artwork[]
};

export class TagModel {

  static fromRow(row: any): ITag {
    return {
      id: row.id,
      name: row.name,
      artworks: row.artworks ? row.artworks.filter((artwork: any) => artwork !== null)
                                           .map((artwork: any) => ArtworkModel.fromRow(artwork)) 
                             : [], 
    };
  }

  static async findByUser(userId: Number): Promise<ITag[]> {
    return (await knex('tags')
                .select(
                  'tags.id',
                  'tags.name',
                  knex.raw('COUNT(*) OVER() AS total'),
                  knex.raw('JSONB_AGG(artworks.*) AS artworks')  
                )
                .leftJoin('artwork_has_tags', 'artwork_has_tags.tag_id', '=', 'tags.id')
                .leftJoin('artworks', 'artworks.id', '=', 'tags.id')
                .groupBy('tags.id')
                .where('tags.user_id', userId))
            .map(this.fromRow);
  }

  static async updateNameById(id: number, name: string, userId: number): Promise<boolean> {
    return await knex('tags')
                    .update({name})
                    .where('tags.user_id', userId)
                    .andWhere('tags.id', id) == 1;
  }

  static async removeById(id: number, userId: number): Promise<boolean> {
    return await knex('tags')
            .delete()
            .where('tags.user_id', userId)
            .andWhere('tags.id', id) == 1;
  }
}