import {
  Client,
  Guild,
  GuildMember,
  Intents,
  MessageEmbed,
  TextBasedChannels,
  TextChannel,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { fetchRemappedData } from "./dsb";
import init from "./initializer";
import { token as Token } from "./token";
import { database } from "./database";
Error.stackTraceLimit = Infinity;

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
    name: "init-dump",
    description:
      "Initialize a channel to dump dsb-mobile stuff (only available to admins)",
  },
  {
    name: "dsb-welcome-info",
    description: "Show my welcome message (only available to admins)",
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
    await interaction.reply("Running tick...");
    tick();
  }

  if (interaction.commandName === "init-dump") {
    if ((interaction.member as GuildMember).permissions.has("ADMINISTRATOR")) {
      interaction.reply(
        `Initialized DSB dump channel ${interaction.channelId}`
      );
      console.log(
        `Initialized DSB dump channel ${interaction.channelId} (#${
          (interaction.channel! as TextChannel).name
        }) on guild ${interaction.guildId} (${interaction.guild!.name})`
      );
      await database.guilds
        .get(interaction.guildId!)
        .settings.dsb_dump.addChannel(interaction.channel!);
      tick();
    } else {
      interaction.reply(
        `<@${interaction.member?.user.id}> You are not allowed to do that!`
      );
    }
  }

  if (interaction.commandName === "dsb-welcome-info") {
    if ((interaction.member as GuildMember).permissions.has("ADMINISTRATOR")) {
      await interaction.reply("Showing welcome message...");
      await interaction.channel?.send({
        content: `@everyone`,
        embeds: [
          new MessageEmbed()
            .setColor("#0099ff")
            .setTitle("DSB Mobile Info")
            //.setURL("https://discord.js.org/")
            .setAuthor(
              "Nicolas Schmidt",
              "http://github.com/nsc-de.png",
              "http://github.com/nsc-de."
            )
            .setDescription(
              "Hallo, ich bin ein Bot und schreibe euch, wenn es Änderungen im Vertretungsplan gibt, die euch betreffen."
            )
            .setThumbnail(
              "https://play-lh.googleusercontent.com/fWFWWKZRFqet1Hhlyb2nz09t-7y8jehZOIo_o28JYPrJ3490JZyyOgWTjPsVpBv1oto"
            )
            .addFields(
              {
                name: "Was tue ich?",
                value:
                  "Ich schreibe euch, wenn es Änderungen im Vertretungsplan gibt. Die entsprechenden Kurse werden über eine @mention erwähnt. So bekommt " +
                  "ihr hier direkt eine Information, wenn euer Unterricht ausfällt",
              },
              {
                name: "Was gibt es zu beachten?",
                value:
                  'Dieser Bot ist nicht _"perfekt"_. Was bedeutet das? Das bedeutet, dass es durchaus passieren kann, dass er fehler macht. Ihr solltet euch ' +
                  "also nicht nur auf den Bot verlassen. Außerdem informiert euch der Bot aktuell nicht, wenn eine Stunde, die als ausfallend markiert wurde, doch stattfinden sollte. " +
                  " Deshalb guckt trotzdem erstmal fleißig auf den Vertretungsplan. Mir fehlt noch ein bisschen selbstsicherheit, weil ich noch nicht lange genug getestet werden konnte :wink:",
              },
              {
                name: "Wie funktioniere ich?",
                value:
                  "Ich bin ein in discord.js (https://discord.js.org/) entwickelter Bot. Mein Schöpfer ist <@281046713437782016>. Er hat mich entwickelt. Ich werde außerdem von <@319871131546943488> " +
                  "gehostet und verwaltet. Vielen Dank dafür :wink:. Ich erhalte die Vertretungsplandaten direkt über DSB-Mobile, also über die gleiche App, die ihr benutzt. Ich überprüfe die App automatisch " +
                  "alle 3 Minuten. Wenn ihr gerne aktuellere Informationen haben wollt, benutzt den befehl `/dump`. Dann überprüfe ich die App und sende die neuen Informationen.",
              },
              {
                name: "Probleme",
                value:
                  "Bei Problemen könnt ihr euch einfach an <@281046713437782016> wenden. Dann hoffen wir einfach mal, dass wir sie lösen können",
              },
              {
                name: "...zum Schluss",
                value:
                  "Zum Schluss bleibt mir nicht viel zu sagen. Ich hoffe, dass dieses feature euch hilft. Ich würde euch raten, eure Kursrollen zu überprüfen. Wenn ihr euren Kursen nicht zugeordnet seid, dann bekommt ihr eure Pings nicht" +
                  " und wenn ihr falschen Kursen Zugeordnet sein solltet, dann bekommt ihr sogar falsche Informationen.",
              }
            )
            .setTimestamp()
            .setFooter(
              "© Nicolas Schmidt 2021",
              "http://github.com/nsc-de.png"
            ),
        ],
      });
    } else {
      interaction.reply(
        `<@${interaction.member?.user.id}> You are not allowed to do that!`
      );
    }
  }
});

async function tick() {
  const data = await fetchRemappedData();
  await Promise.all(
    database.guilds.map(async (g) => {
      const guild = await client.guilds.fetch(g.id);
      const mappedData = data
        .map((e) => ({
          ...e,
          role: guild.roles.cache.find((role) => role.name === e.subgroup),
        }))
        .filter((e) => e.group == "12");
      await Promise.all(
        g.settings.dsb_dump.map(async (c) => {
          const channel = (await client.channels.fetch(
            c.channelId
          )) as TextBasedChannels;
          for (let d of mappedData) {
            const dateCache = c.cache.getCreate(d.date);

            if (
              !dateCache.find(
                (e) =>
                  e.type == d.type &&
                  e.group == d.group &&
                  e.subgroup == d.subgroup &&
                  e.time == d.time &&
                  e.subject == d.subject &&
                  e.room == d.room
              )
            ) {
              let message: string = `\`${
                d.subject
              }\` am \`${d.date.toLocaleDateString("de-DE")}\`  in Stunde \`${
                d.time
              }\` wurde als \`${d.type}\` markiert${
                d.text ? `: \`${d.text}\`` : "!"
              }`;
              if (d.role) await channel.send(`<@&${d.role.id}> ${message}`);
              else await channel.send(`@${d.group} ${message}`);
              dateCache.pushCache({
                from: d.from,
                group: d.group,
                room: d.room,
                subgroup: d.subgroup,
                subject: d.subject,
                time: d.time,
                to: d.to,
                type: d.type,
                text: d.text,
              });

              await timeout(2000);
            }
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
