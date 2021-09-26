import { Snowflake } from "@discordjs/builders/node_modules/discord-api-types";
import {
  DMChannel,
  Guild,
  NewsChannel,
  TextBasedChannels,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { createDatabase, Database, DatabaseObject } from "nscdb";
import { JsonFileAdapter } from "nscdb/json_adapter";
import { join } from "path";
import { token } from "./token";

const defaultDatabasePath = join(__dirname, "..", "database.json");

export class DiscordSBDatabase {
  readonly guilds = new DiscordSBDatabaseGuilds(this);
  constructor(public readonly storage: Database) {}
  save(): Promise<DiscordSBDatabase> {
    return this.storage.saveData().then(() => this);
  }
}

export interface DatabaseGuild {
  id: string;
  name: string;
  owner: {
    id: Snowflake;
    tag: string;
    name: string;
  };
}

export class DiscordSBDatabaseGuilds {
  constructor(readonly database: DiscordSBDatabase) {}

  public keys(): Snowflake[] {
    return Object.keys((this.storage.get("guilds") as DatabaseObject).data);
  }
  public forEach(run: (g: DiscordSBDatabaseGuild, id: Snowflake) => void) {
    this.keys().forEach((id) => run(this.get(id), id));
  }
  public map<T>(run: (g: DiscordSBDatabaseGuild, id: Snowflake) => T): T[] {
    return this.keys().map((id) => run(this.get(id), id));
  }
  public has(id: Snowflake): boolean;
  public has(guild: Guild): boolean;
  public has(arg0: Snowflake | Guild): boolean {
    if (arg0 instanceof Guild) return this.has(arg0.id);
    return (this.storage.get("guilds") as DatabaseObject).contains(arg0);
  }
  public get(id: Snowflake): DiscordSBDatabaseGuild;
  public get(guild: Guild): DiscordSBDatabaseGuild;
  public get(arg0: Snowflake | Guild): DiscordSBDatabaseGuild {
    if (arg0 instanceof Guild) return this.get(arg0.id);
    if (!this.has(arg0))
      throw new Error(`Does not contain server with id "${arg0}"`);

    return new DiscordSBDatabaseGuild(arg0, this);
  }

  public get storage(): Database {
    return this.database.storage;
  }

  public addGuild(guild: Guild): Promise<DiscordSBDatabaseGuild>;
  public addGuild(guild: DatabaseGuild): DiscordSBDatabaseGuild;
  public addGuild(
    guild: Guild | DatabaseGuild
  ): DiscordSBDatabaseGuild | Promise<DiscordSBDatabaseGuild> {
    if (guild instanceof Guild) {
      return (async () =>
        this.addGuild({
          id: guild.id,
          name: guild.name,
          owner: await guild.fetchOwner().then((owner) => ({
            id: owner.id,
            name: owner.user.username,
            tag: owner.user.tag,
          })),
        }))();
    } else {
      this.storage.set(`guilds.${guild.id}`, {
        settings: {
          channels: {},
          dsb_dumps: {},
        },
        ...(guild as any),
      });
      this.database.save();
      return this.get(guild.id);
    }
  }
}

export class DiscordSBDatabaseGuild {
  readonly settings = new DiscordSBDatabaseGuildSettings(this);
  readonly owner = new DiscordSBDatabaseGuildOwner(this);
  constructor(
    readonly id: Snowflake,
    readonly guild_list: DiscordSBDatabaseGuilds
  ) {}

  public get database(): DiscordSBDatabase {
    return this.guild_list.database;
  }
  public get storage(): Database {
    return this.database.storage;
  }

  public get name(): Snowflake {
    return this.storage.get(`guilds.${this.id}.name`) as Snowflake;
  }
  public set name(tag: Snowflake) {
    this.storage.set(`guilds.${this.id}.name`, tag);
    this.database.save();
  }
}

export class DiscordSBDatabaseGuildOwner {
  constructor(readonly guild: DiscordSBDatabaseGuild) {}

  public get guild_list(): DiscordSBDatabaseGuilds {
    return this.guild.guild_list;
  }
  public get database(): DiscordSBDatabase {
    return this.guild_list.database;
  }
  public get storage(): Database {
    return this.database.storage;
  }

  public get id(): Snowflake {
    return this.storage.get(`guilds.${this.guild.id}.owner.id`) as Snowflake;
  }
  public set id(id: Snowflake) {
    this.storage.set(`guilds.${this.guild.id}.owner.id`, id);
    this.database.save();
  }

  public get tag(): Snowflake {
    return this.storage.get(`guilds.${this.guild.id}.owner.tag`) as Snowflake;
  }
  public set tag(tag: Snowflake) {
    this.storage.set(`guilds.${this.guild.id}.owner.tag`, tag);
    this.database.save();
  }

  public get name(): Snowflake {
    return this.storage.get(`guilds.${this.guild.id}.owner.name`) as Snowflake;
  }
  public set name(tag: Snowflake) {
    this.storage.set(`guilds.${this.guild.id}.owner.name`, tag);
    this.database.save();
  }
}

export class DiscordSBDatabaseGuildSettings {
  readonly channels = new DiscordSBDatabaseGuildSettingsChannels(this);
  readonly dsb_dump = new DiscordSBDatabaseGuildSettingsDSBDumps(this);
  constructor(readonly guild: DiscordSBDatabaseGuild) {}

  public get guild_list(): DiscordSBDatabaseGuilds {
    return this.guild.guild_list;
  }
  public get database(): DiscordSBDatabase {
    return this.guild_list.database;
  }
  public get storage(): Database {
    return this.database.storage;
  }
}

export class DiscordSBDatabaseGuildSettingsChannels {
  constructor(readonly settings: DiscordSBDatabaseGuildSettings) {}

  public get guild(): DiscordSBDatabaseGuild {
    return this.settings.guild;
  }
  public get guild_list(): DiscordSBDatabaseGuilds {
    return this.guild.guild_list;
  }
  public get database(): DiscordSBDatabase {
    return this.guild_list.database;
  }
  public get storage(): Database {
    return this.database.storage;
  }
}

export interface DatabaseDumpChannel {
  id: string;
  name: string;
}

export class DiscordSBDatabaseGuildSettingsDSBDumps {
  constructor(readonly settings: DiscordSBDatabaseGuildSettings) {}

  public keys(): Snowflake[] {
    return Object.keys(
      (
        this.storage.get(
          `guilds.${this.guild.id}.settings.dsb_dumps`
        ) as DatabaseObject
      ).data
    );
  }
  public forEach(
    run: (g: DiscordSBDatabaseGuildSettingsDSBDump, id: Snowflake) => void
  ) {
    this.keys().forEach((id) => run(this.get(id), id));
  }
  public map<T>(
    run: (g: DiscordSBDatabaseGuildSettingsDSBDump, id: Snowflake) => T
  ): T[] {
    return this.keys().map((id) => run(this.get(id), id));
  }

  public get guild(): DiscordSBDatabaseGuild {
    return this.settings.guild;
  }
  public get guild_list(): DiscordSBDatabaseGuilds {
    return this.guild.guild_list;
  }
  public get database(): DiscordSBDatabase {
    return this.guild_list.database;
  }
  public get storage(): Database {
    return this.database.storage;
  }

  public has(id: Snowflake): boolean {
    return (
      this.storage.get(
        `guilds.${this.guild.id}.settings.dsb_dumps`
      ) as DatabaseObject
    ).contains(id);
  }
  public get(channelId: Snowflake) {
    if (!this.has(channelId))
      throw new Error(`Does not contain server with id "${channelId}"`);

    return new DiscordSBDatabaseGuildSettingsDSBDump(channelId, this);
  }

  public addChannel(
    channel: TextBasedChannels
  ): Promise<DiscordSBDatabaseGuildSettingsDSBDump>;
  public addChannel(
    channel: DatabaseDumpChannel
  ): DiscordSBDatabaseGuildSettingsDSBDump;
  public addChannel(
    channel: TextBasedChannels | DatabaseDumpChannel
  ):
    | DiscordSBDatabaseGuildSettingsDSBDump
    | Promise<DiscordSBDatabaseGuildSettingsDSBDump> {
    if (
      channel instanceof TextChannel ||
      channel instanceof NewsChannel ||
      channel instanceof ThreadChannel
    ) {
      return (async () =>
        this.addChannel({
          id: channel.id,
          name: channel.name,
        }))();
    } else {
      this.storage.set(
        `guilds.${this.guild.id}.settings.dsb_dumps.${channel.id}`,
        {
          cache: {
            sent: [],
          },
          ...(channel as any),
        }
      );
      this.database.save();
      return this.get(channel.id);
    }
  }
}

export class DiscordSBDatabaseGuildSettingsDSBDump {
  constructor(
    readonly channelId: Snowflake,
    readonly dumps: DiscordSBDatabaseGuildSettingsDSBDumps
  ) {}

  public get settings(): DiscordSBDatabaseGuildSettings {
    return this.dumps.settings;
  }
  public get guild(): DiscordSBDatabaseGuild {
    return this.settings.guild;
  }
  public get guild_list(): DiscordSBDatabaseGuilds {
    return this.guild.guild_list;
  }
  public get database(): DiscordSBDatabase {
    return this.guild_list.database;
  }
  public get storage(): Database {
    return this.database.storage;
  }
}

interface DiscordSBDatabaseCreationOptions {
  path?: string;
}

export async function createDiscordSBDatabase(
  options?: DiscordSBDatabaseCreationOptions
): Promise<DiscordSBDatabase> {
  const path = options?.path || defaultDatabasePath;
  let database = await createDatabase(new JsonFileAdapter(path));

  // Set defaults
  database.setDefaults({
    guilds: {},
  });

  const db = new DiscordSBDatabase(database);
  db.save();
  return db;
}

export let database: DiscordSBDatabase;
export let initialized: boolean = false;

export async function init(
  options?: DiscordSBDatabaseCreationOptions
): Promise<DiscordSBDatabase> {
  return (database = await createDiscordSBDatabase(options));
}
