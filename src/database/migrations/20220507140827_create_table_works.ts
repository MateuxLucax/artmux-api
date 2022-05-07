import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('works', table => {
    table.bigIncrements('id').primary()
    table.bigInteger('user_id').references('users.id')
    table.text('title').notNullable()
    table.text('observations')
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
    table.text('img_path_original').notNullable()
    table.text('img_path_medium').notNullable()
  })
  .raw('ALTER TABLE works ADD COLUMN img_bytes_thumbnail bytea NOT NULL')
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('works')
}

