import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema
  .createTable('publications', table => {
    table.bigIncrements('id');
    table.text('title');
    table.text('text').notNullable();
    table.bigint('user_id').references('users.id').notNullable();
    table.timestamps({ defaultToNow: true });
  })
  .createTable('publication_has_artworks', table => {
    table.bigint('publication_id').references('publications.id')
      .onUpdate('cascade').onDelete('cascade');
    table.bigint('artwork_id').references('artworks.id')
      .onUpdate('cascade').onDelete('cascade');
    table.primary(['publication_id', 'artwork_id']);
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
  .dropTable('publication_has_artworks')
  .dropTable('publications');
}

