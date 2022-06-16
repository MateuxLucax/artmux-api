import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema
  .createTable('tags', table => {
    table.bigIncrements('id').primary();
    table.text('name').unique().notNullable();
    table.bigInteger('user_id').references('users.id')
      .onDelete('cascade')
      .onUpdate('cascade');
  })
  .createTable('artwork_has_tags', table => {
    table.bigint('artwork_id').references('artworks.id')
      .onDelete('cascade')
      .onUpdate('cascade');
    table.bigInteger('tag_id').references('tags.id')
      .onDelete('cascade')
      .onUpdate('cascade');
    table.primary([ 'artwork_id', 'tag_id' ]);
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
  .dropTable('artwork_has_tags')
  .dropTable('tags');
}
