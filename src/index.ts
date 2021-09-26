import {
  Client,
  Guild,
  Intents,
  TextBasedChannels,
  TextChannel,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { fetchRemappedData } from "./dsb";
import init from "./initializer";
import { token as Token } from "./token";
import { database } from "./database";

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
  {
    name: "init_dump",
    description: "Initialize a channel to dump dsb-mobile stuff",
  },
];

const rest = new REST({ version: "9" });

async function initGuild(guild: Guild) {
  if (!database.guilds.has(guild)) {
    console.log(`Found and added new guild ${guild.id}`);
    database.guilds.addGuild(guild);
  }
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

  const aw = (...stuff: any[]) =>
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
  setInterval(tick, 3 * 60000 /* tick every 3 minutes */);
  tick();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!");
  }

  if (interaction.commandName === "dump") {
    await interaction.reply("listing...");
    /*
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
    }*/

    tick();
  }

  if (interaction.commandName === "init_dump") {
    interaction.reply(`Initialized DSB dump channel ${interaction.channelId}`);
    console.log(
      `Initialized DSB dump channel ${interaction.channelId} (#${
        (interaction.channel! as TextChannel).name
      }) on guild ${interaction.guildId} (${interaction.guild!.name})`
    );
    await database.guilds
      .get(interaction.guildId!)
      .settings.dsb_dump.addChannel(interaction.channel!);
    tick();
  }
});

async function tick() {
  const data = await fetchRemappedData();
  await Promise.all(
    database.guilds.map(async (g) => {
      const guild = await client.guilds.fetch(g.id);
      const mappedData = data.map((e) => ({
        ...e,
        role: guild.roles.cache.find((role) => role.name === e.subgroup),
      }));
      // .filter((e) => !!e.role);
      await Promise.all(
        g.settings.dsb_dump.map(async (c) => {
          const channel = (await client.channels.fetch(
            c.channelId
          )) as TextBasedChannels;
          for (let d of mappedData) {
            let message: string = `\`${
              d.subject
            }\` am \`${d.date.toLocaleDateString("de-DE")}\`  in Stunde \`${
              d.time
            }\` wurde als \`${d.type}\` markiert${
              d.text ? `: \`${d.text}\`` : "!"
            }`;
            if (d.role) await channel.send(`<@&${d.role.id}> ${message}`);
            else await channel.send(`@${d.group} ${message}`);
            await timeout(2000);
          }
        })
      );
    })
  );
}

// main
(async () => {
  // init config
  await init();
  const token = await Token.getToken();
  rest.setToken(token);
  client.login(token);
})();

const timeout = (time: number) => new Promise((rs) => setTimeout(rs, time));

export { client };
