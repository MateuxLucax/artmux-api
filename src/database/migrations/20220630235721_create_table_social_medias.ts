import { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("social_medias", table => {
    table.bigIncrements("id").primary()
    table.string("name").unique().notNullable()
    table.jsonb("config")
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now())
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now())
    table.index("created_at")
    table.index("updated_at")
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("social_medias")
}
