import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artworks', table => {
    table.text('slug').notNullable()
    // We want slugs to be unique, but also want to allow the user to have
    // artworks with duplicate titles. So we add the slug_num to distinguish
    // between artworks that have the same slug.
    table.integer('slug_num').notNullable().defaultTo(1)
    table.unique(['user_id', 'slug', 'slug_num'])
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('artworks', table => {
    table.dropUnique(['user_id', 'slug', 'slug_num'])
    table.dropColumn('slug')
    table.dropColumn('slug_num')
  })
}

