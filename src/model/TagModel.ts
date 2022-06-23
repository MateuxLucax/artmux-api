
export type Tag = {
  id?: number,
  name: string
};

export class TagModel {

  static fromRow(row: any): Tag {
    return {
      id: row.id,
      name: row.name
    };
  }
}