import { BaseGuildTextChannel, Client, Guild, Intents } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { fetchRemappedData } from "./dsb";
import init from "./initializer";
import { token as Token } from "./token";

const guilds: Guild[] = [];

const commands = [
  {
    name: "ping",
    description: "Replies with Pong!",
  },
  {
    name: "dump",
    description: "Ping all dsb-mobile stuff!",
  },
];

const rest = new REST({ version: "9" });

async function initGuild(guild: Guild) {
  try {
    await rest.put(
      Routes.applicationGuildCommands(guild.client.user!.id, guild.id),
      {
        body: commands,
      }
    );
  } catch (error) {
    console.error(error);
  }
}

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

  guilds.forEach((guild) => aw(initGuild(guild)));

  await Promise.all(promises);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
  }

  if (interaction.commandName === "dump") {
    const data = await (
      await fetchRemappedData()
    )
      .filter((e) => e.group === "12")
      .map((e) => ({
        ...e,
        role: interaction.guild!.roles.cache.find(
          (role) => role.name === e.subgroup
        ),
      }))
      .filter((e) => !!e.role);

    interaction.reply("listing...");
    for (let d of data) {
      let message: string;
      await interaction.channel!.send(
        `<@&${d.role?.id}> \`${d.subject}\` am \`${d.date.toLocaleDateString(
          "de-DE"
        )}\`  in Stunde \`${d.time}\` wurde als \`${d.type}\` markiert${
          d.text ? `: \`${d.text}\`` : "!"
        }`
      );
    }
  }
});

// main
(async () => {
  // init config
  await init();
  const token = await Token.getToken();
  rest.setToken(token);
  client.login(token);
})();

export { client };
