import { Knex } from "knex"


export async function up(knex: Knex): Promise<void> {
  await knex.schema
  .createTable('publications', table => {
    table.bigIncrements('id')
    table.text('title').notNullable()
    table.text('text').notNullable()

    table.bigint('user_id').references('users.id').notNullable()
    table.text('slug_text').notNullable()
    table.integer('slug_num').notNullable()
    table.unique(['user_id', 'slug_text', 'slug_num'])

    table.timestamps({ defaultToNow: true })
  })
  .createTable('publication_has_artworks', table => {
    table.bigint('publication_id').references('publications.id')
      .onUpdate('cascade').onDelete('cascade')
    table.bigint('artwork_id').references('artworks.id')
      .onUpdate('no action').onDelete('no action')
    table.primary(['publication_id', 'artwork_id'])
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
  .dropTable('publication_has_artworks')
  .dropTable('publications')
}
