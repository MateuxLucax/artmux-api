import { Knex } from "knex"

export async function seed(knex: Knex): Promise<void> {
    await knex("social_medias").del()

    await knex("social_medias").insert([
        { 
            id: 1, 
            name: "Twitter",
            config: JSON.stringify({
                "btnBgColor": "#1DA1F2",
                "btnTextColor": "#F5F8FA",
                "btnIcon": `<i class="bi bi-twitter"></i>`,
                "constraints": {
                    "text": 240,
                    "media": 4
                }
            }),
        },
        { 
            id: 2,
            name: "Reddit",
            config: JSON.stringify({
                "btnBgColor": "#FF4500",
                "btnTextColor": "#FFFFFF",
                "btnIcon": `<i class="bi bi-reddit"></i>`,
                "constraints": {} // TODO
            }),
        }
    ])
}
