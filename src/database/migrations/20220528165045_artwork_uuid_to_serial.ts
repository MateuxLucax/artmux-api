import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema
  .alterTable('artwork_has_tags', at => at.dropForeign('artwork_uuid'))
  .alterTable('artworks', a => a.dropPrimary('works_pkey'))
  .alterTable('artworks', a => a.bigIncrements('id'))
  .alterTable('artwork_has_tags', at => at.bigint('artwork_id'));

  await knex('artwork_has_tags')
  .update({ artwork_id : knex.raw('(SELECT id FROM artworks WHERE uuid = artwork_has_tags.artwork_uuid)') })

  await knex.schema
  .alterTable('artwork_has_tags', at => {
    at.foreign('artwork_id').references('artworks.id')
      .onUpdate('cascade')
      .onDelete('cascade');
    at.primary(['artwork_id', 'tag_id']);
    at.dropColumn('artwork_uuid');
  })
  .alterTable('artworks', a => a.dropColumn('uuid'));
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema
  .alterTable('artwork_has_tags', at => {
    at.dropPrimary();
    at.dropForeign('artwork_id');
  })
  .alterTable('artworks', a => a.dropPrimary())
  .alterTable('artworks', a => a.uuid('uuid'));

  // https://stackoverflow.com/a/21327318
  await knex('artworks').update({ uuid: knex.raw('md5(random()::text || clock_timestamp()::text)::uuid') });

  await knex.schema
  .alterTable('artworks', a => a.primary(['uuid'], { constraintName: 'works_pkey' }))
  .alterTable('artwork_has_tags', at => at.uuid('artwork_uuid'));

  await knex('artwork_has_tags')
  .update({ artwork_uuid : knex.raw('(SELECT uuid FROM artworks WHERE id = artwork_has_tags.artwork_id)') })

  await knex.schema
  .alterTable('artwork_has_tags', at => {
    at.foreign('artwork_uuid').references('artworks.uuid')
      .onUpdate('cascade')
      .onDelete('cascade');
    at.dropColumn('artwork_id');
  })
  .alterTable('artworks', a => a.dropColumn('id'));
}

