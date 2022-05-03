import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    await knex('users').del();

    await knex('users').insert(
        {
            username: 'mateuxlucax',
            email: 'mateuxlucax@gmail.com',
            password: 'testpassword',
            salt: 'testsalt',
        }
    );
};
