import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    // await knex('tags').del();

    // await knex('tags').insert([
    //     { user_id: 1, name: 'portrait' },
    //     { user_id: 1, name: 'landscape' },
    //     { user_id: 1, name: 'surreal' },
    //     { user_id: 1, name: 'weird' },
    //     { user_id: 1, name: 'cool' },
    //     { user_id: 1, name: '2022-04' },
    //     { user_id: 1, name: '2022-05' },
    // ]);

    // This didn't really work. Knex runs all the seeds, and if you've created artworks
    // with the user in 001_users.ts it won't work. Just do this instead, or with whichever values you prefer:
    /*
    INSERT INTO tags (user_id, name) VALUES (1, 'portrait');
    INSERT INTO tags (user_id, name) VALUES (1, 'landscape');
    INSERT INTO tags (user_id, name) VALUES (1, 'surreal');
    INSERT INTO tags (user_id, name) VALUES (1, 'weird');
    INSERT INTO tags (user_id, name) VALUES (1, 'cool');
    INSERT INTO tags (user_id, name) VALUES (1, '2022-04');
    INSERT INTO tags (user_id, name) VALUES (1, '2022-05');
    */

};
