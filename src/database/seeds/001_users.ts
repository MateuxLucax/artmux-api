import { Knex } from "knex";
import { UserModel } from "../../model/UserModel";

export async function seed(knex: Knex): Promise<void> {
    await knex('users').del();

    const { hashedPassword, salt } = await UserModel.hashPassword('123456', 'admin');

    await knex('users').insert(
        {
            username: 'admin',
            email: 'admin@artmux.dev',
            password: hashedPassword,
            salt: salt,
        }
    );
};
