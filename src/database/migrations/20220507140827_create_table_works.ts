import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('works', table => {
    table.uuid('uuid').primary()
    table.bigInteger('user_id').references('users.id')
    table.text('title').notNullable()
    table.text('observations')
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
    // TODO apart from the file extension, the values of these columns will be highly redundant:
    // /workimg/{workuuid}_{size}.{extension}
    // so we probably could get away with just storing the extension
    table.text('img_path_original').notNullable()
    table.text('img_path_medium').notNullable()
    table.text('img_path_thumbnail').notNullable()
    table.index('created_at')
    table.index('updated_at')
  })
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('works')
}

