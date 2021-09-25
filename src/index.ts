import { Client, Guild, Intents } from "discord.js";
import init from "./initializer";
import { token as Token } from "./token";

const guilds: Guild[] = [];

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.on("ready", async () => {
  guilds.push(...client.guilds.cache.toJSON());

  const promises: Promise<any>[] = [];

  const aw = (...stuff: (Promise<any> | undefined)[]) =>
    promises.push(...(stuff.filter((e) => !!e) as Promise<any>[]));

  // List guilds to console
  console.log(
    `Logged in as ${client.user?.id} (${client.user?.tag})! I am on ${
      guilds.length
    } guild${guilds.length != 1 ? "s" : ""}:`
  );
  aw(
    Promise.all([
      await Promise.all(
        guilds.map(
          async (g) =>
            `  -  ${g.id} ("${g.name}"), owner: ${g.ownerId} (${
              (
                await client.users?.fetch(g.ownerId)
              ).tag
            })`
        )
      ).then((e) => console.log(e.join("\n"))),
    ])
  );

  // Set online status
  client.user?.setStatus("online");
  await Promise.all(promises);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
  }
});

// main
(async () => {
  // init config
  await init();
  const token = await Token.getToken();
  client.login(token);
})();

export { client };
