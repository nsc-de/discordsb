import { Snowflake } from "@discordjs/builders/node_modules/discord-api-types";
import {
  Guild,
  NewsChannel,
  TextBasedChannels,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { createDatabase, Database, DatabaseArray, DatabaseObject } from "nscdb";
import { JsonFileAdapter } from "nscdb/json_adapter";
import { join } from "path";

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
  readonly path = `guilds`;

  constructor(readonly database: DiscordSBDatabase) {}

  public keys(): Snowflake[] {
    return Object.keys((this.storage.get(this.path) as DatabaseObject).data);
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
    return (this.storage.get(this.path) as DatabaseObject).contains(arg0);
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
      this.storage.set(`${this.path}.${guild.id}`, {
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
  readonly path = `${this.guild_list.path}.${this.id}`;
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
    return this.storage.get(`${this.path}.name`) as Snowflake;
  }
  public set name(tag: Snowflake) {
    this.storage.set(`${this.path}.name`, tag);
    this.database.save();
  }
}

export class DiscordSBDatabaseGuildOwner {
  readonly path = `${this.guild.path}.owner`;
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
    return this.storage.get(`${this.path}.id`) as Snowflake;
  }
  public set id(id: Snowflake) {
    this.storage.set(`${this.path}.id`, id);
    this.database.save();
  }

  public get tag(): Snowflake {
    return this.storage.get(`${this.path}.tag`) as Snowflake;
  }
  public set tag(tag: Snowflake) {
    this.storage.set(`${this.path}.tag`, tag);
    this.database.save();
  }

  public get name(): Snowflake {
    return this.storage.get(`${this.path}.name`) as Snowflake;
  }
  public set name(name: Snowflake) {
    this.storage.set(`${this.path}.name`, name);
    this.database.save();
  }
}

export class DiscordSBDatabaseGuildSettings {
  readonly path = `${this.guild.path}.settings`;
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
  readonly path = `${this.settings.path}.channels`;
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
  readonly path = `${this.settings.path}.dsb_dumps`;
  constructor(readonly settings: DiscordSBDatabaseGuildSettings) {}

  public keys(): Snowflake[] {
    return Object.keys((this.storage.get(this.path) as DatabaseObject).data);
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
    return (this.storage.get(this.path) as DatabaseObject).contains(id);
  }
  public get(channelId: Snowflake) {
    if (!this.has(channelId))
      throw new Error(`Does not contain channel with id "${channelId}"`);

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
      this.storage.set(`${this.path}.${channel.id}`, {
        cache: {
          sent: {},
        },
        ...(channel as any),
      });
      this.database.save();
      return this.get(channel.id);
    }
  }
}

export class DiscordSBDatabaseGuildSettingsDSBDump {
  readonly path = `${this.dumps.path}.${this.channelId}`;
  readonly cache = new DiscordSBDatabaseGuildSettingsDSBDumpCaches(this);
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

  public get name(): Snowflake {
    return this.storage.get(`${this.path}.name`) as Snowflake;
  }
  public set name(name: Snowflake) {
    this.storage.set(`${this.path}.name`, name);
    this.database.save();
  }
}

export class DiscordSBDatabaseGuildSettingsDSBDumpCaches {
  readonly path = `${this.dump.path}.cache.sent`;
  constructor(readonly dump: DiscordSBDatabaseGuildSettingsDSBDump) {}

  public keys(): Date[] {
    return Object.keys(this.storage.getNormal(this.path) as any).map((e) =>
      parseDate(e)
    );
  }
  public forEach(
    run: (
      g: DiscordSBDatabaseGuildSettingsDSBDumpCachesDate,
      date: Date
    ) => void
  ) {
    this.keys().forEach((d) => {
      return run(this.get(d), d);
    });
  }
  public map<T>(
    run: (g: DiscordSBDatabaseGuildSettingsDSBDumpCachesDate, date: Date) => T
  ): T[] {
    return this.keys().map((d) => {
      return run(this.get(d), d);
    });
  }
  public find(
    run: (
      g: DiscordSBDatabaseGuildSettingsDSBDumpCachesDate,
      date: Date
    ) => boolean
  ): DiscordSBDatabaseGuildSettingsDSBDumpCachesDate | undefined {
    const key = this.keys().find((d) => {
      return run(this.get(d), d);
    });
    if (key) return this.get(key);
  }

  public has(date: Date): boolean {
    return this.storage.contains(`${this.path}.${stringifyDate(date)}`);
  }
  public get(date: Date) {
    if (!this.has(date))
      throw new Error(`Does not contain date "${stringifyDate(date)}"`);

    return new DiscordSBDatabaseGuildSettingsDSBDumpCachesDate(date, this);
  }

  public get dumps(): DiscordSBDatabaseGuildSettingsDSBDumps {
    return this.dump.dumps;
  }
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

  public createDate(d: Date): DiscordSBDatabaseGuildSettingsDSBDumpCachesDate {
    this.storage.set(`${this.path}.${stringifyDate(d)}`, []);
    this.database.save();
    return this.get(d);
  }
  public getCreate(d: Date): DiscordSBDatabaseGuildSettingsDSBDumpCachesDate {
    if (this.has(d)) return this.get(d);
    else return this.createDate(d);
  }
}

export class DiscordSBDatabaseGuildSettingsDSBDumpCachesDate {
  readonly path = `${this.caches.path}.${stringifyDate(this.date)}`;
  constructor(
    readonly date: Date,
    readonly caches: DiscordSBDatabaseGuildSettingsDSBDumpCaches
  ) {}

  public get length(): number {
    return (this.storage.get(this.path) as DatabaseArray).length;
  }
  public forEach(
    run: (
      cache: DiscordSBDatabaseGuildSettingsDSBDumpCache,
      index: number
    ) => void
  ) {
    const length = this.length;
    for (let i = 0; i < length; i++) {
      run(this.get(i), i);
    }
  }
  public map<T>(
    run: (cache: DiscordSBDatabaseGuildSettingsDSBDumpCache, index: number) => T
  ): T[] {
    const length = this.length;
    const ret = [];
    for (let i = 0; i < length; i++) {
      ret.push(run(this.get(i), i));
    }
    return ret;
  }
  public find(
    run: (
      cache: DiscordSBDatabaseGuildSettingsDSBDumpCache,
      index: number
    ) => boolean
  ): DiscordSBDatabaseGuildSettingsDSBDumpCache | undefined {
    const length = this.length;
    for (let i = 0; i < length; i++)
      if (run(this.get(i), i)) return this.get(i);
  }

  public has(i: number): boolean {
    return this.length > i;
  }
  public get(i: number) {
    if (!this.has(i)) throw new Error(`Does not contain date index ${i}`);
    return new DiscordSBDatabaseGuildSettingsDSBDumpCache(i, this);
  }

  public get dump(): DiscordSBDatabaseGuildSettingsDSBDump {
    return this.caches.dump;
  }
  public get dumps(): DiscordSBDatabaseGuildSettingsDSBDumps {
    return this.dump.dumps;
  }
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

  public pushCache(cache: {
    type: string;
    group: string;
    subgroup: string;
    time: string;
    from: number;
    to: number;
    subject: string;
    room: string;
    text?: string;
  }): DiscordSBDatabaseGuildSettingsDSBDumpCache {
    const index = this.length;
    (this.storage.get(`${this.path}`) as DatabaseArray).push(cache);
    this.database.save();
    return this.get(index);
  }
}

export class DiscordSBDatabaseGuildSettingsDSBDumpCache {
  readonly path = `${this.date.path}.${this.id}`;
  constructor(
    readonly id: number,
    readonly date: DiscordSBDatabaseGuildSettingsDSBDumpCachesDate
  ) {}

  public get caches(): DiscordSBDatabaseGuildSettingsDSBDumpCaches {
    return this.date.caches;
  }
  public get dump(): DiscordSBDatabaseGuildSettingsDSBDump {
    return this.caches.dump;
  }
  public get dumps(): DiscordSBDatabaseGuildSettingsDSBDumps {
    return this.dump.dumps;
  }
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

  public get type(): string {
    return this.storage.get(`${this.path}.type`) as string;
  }
  public set type(type: string) {
    this.storage.set(`${this.path}.type`, type);
    this.database.save();
  }

  public get group(): string {
    return this.storage.get(`${this.path}.group`) as string;
  }
  public set group(group: string) {
    this.storage.set(`${this.path}.group`, group);
    this.database.save();
  }

  public get subgroup(): string {
    return this.storage.get(`${this.path}.subgroup`) as string;
  }
  public set subgroup(subgroup: string) {
    this.storage.set(`${this.path}.subgroup`, subgroup);
    this.database.save();
  }

  public get time(): string {
    return this.storage.get(`${this.path}.time`) as string;
  }
  public set time(time: string) {
    this.storage.set(`${this.path}.time`, time);
    this.database.save();
  }

  public get subject(): string {
    return this.storage.get(`${this.path}.subject`) as string;
  }
  public set subject(subject: string) {
    this.storage.set(`${this.path}.subject`, subject);
    this.database.save();
  }

  public get room(): string {
    return this.storage.get(`${this.path}.room`) as string;
  }
  public set room(room: string) {
    this.storage.set(`${this.path}.room`, room);
    this.database.save();
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

function stringifyDate(date: Date) {
  const day = ("0" + date.getDate()).slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  return `${year}/${month}/${day}`;
}
function parseDate(date: string) {
  return new Date(date);
}
