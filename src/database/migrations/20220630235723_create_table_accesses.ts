import { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("accesses", table => {
    table.bigIncrements("id").primary()
    table.jsonb("data")
    table.string("salt").notNullable()
    table.bigInteger("user_id").references("users.id")
    table.bigInteger("social_media_id").references("social_medias.id")
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now())
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now())
    table.index("created_at")
    table.index("updated_at")
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("accesses")
}
