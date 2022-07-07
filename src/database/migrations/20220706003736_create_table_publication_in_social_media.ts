import { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("publication_in_social_media", table => {
    table.bigIncrements("id").primary()
    table.bigInteger("publication_id").references("publications.id").onDelete("cascade").onUpdate("cascade")
    table.bigInteger("social_media_id").references("social_medias.id").onDelete("cascade").onUpdate("cascade")
    table.bigInteger("access_id").references("accesses.id").onDelete("cascade").onUpdate("cascade")
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now())
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now())
    table.index("created_at")
    table.index("updated_at")
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("publication_in_social_media")
}
