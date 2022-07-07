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
    const tags = await knex('tags')
                .select(
                  'tags.id',
                  'tags.name',
                  knex.raw('COUNT(*) OVER() AS total'),
                )
                .groupBy('tags.id')
                .where('tags.user_id', userId)

    return await Promise.all(tags.map(async row => {
      row.artworks = await knex("artworks")
        .select("artworks.*")
        .join("artwork_has_tags", "artwork_has_tags.artwork_id", "=", "artworks.id")
        .join("tags", "artwork_has_tags.tag_id", "=", "tags.id")
        .where("artwork_has_tags.tag_id", row.id)

      return this.fromRow(row)
    }))
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