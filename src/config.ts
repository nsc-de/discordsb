import { createDatabase, Database, DatabaseObject } from "nscdb";
import { YamlFileAdapter } from "nscdb/yaml_adapter";
import { join } from "path";

const defaultConfigPath = join(__dirname, "..", "config.yml");

export class Config {
  readonly credentials: CredentialsConfig = new CredentialsConfig(this);
  readonly dsb_credentials: DSBCredentialsConfig = new DSBCredentialsConfig(
    this
  );
  constructor(public readonly storage: Database) {}
  save(): Promise<Config> {
    return this.storage.saveData().then(() => this);
  }
}

export class CredentialsConfig {
  constructor(readonly config: Config) {}

  public get storage(): Database {
    return this.config.storage;
  }

  public get token(): string | null {
    return (this.storage.get("credentials") as DatabaseObject).get("token") as
      | string
      | null;
  }
  public set token(token: string | null) {
    (this.storage.get("credentials") as DatabaseObject).set("token", token);
    this.config.save();
  }
}

export class DSBCredentialsConfig {
  constructor(readonly config: Config) {}

  public get storage(): Database {
    return this.config.storage;
  }

  public get user(): string | null {
    return (this.storage.get("dsb_credentials") as DatabaseObject).get(
      "user"
    ) as string | null;
  }
  public set user(token: string | null) {
    (this.storage.get("dsb_credentials") as DatabaseObject).set("user", token);
    this.config.save();
  }

  public get password(): string | null {
    return (this.storage.get("dsb_credentials") as DatabaseObject).get(
      "password"
    ) as string | null;
  }
  public set password(token: string | null) {
    (this.storage.get("dsb_credentials") as DatabaseObject).set(
      "password",
      token
    );
    this.config.save();
  }
}

interface ConfigurationCreationOptions {
  path?: string;
}

export async function createConfig(
  options?: ConfigurationCreationOptions
): Promise<Config> {
  const path = options?.path || defaultConfigPath;
  let config = await createDatabase(new YamlFileAdapter(path));

  // Set defaults
  config.setDefaults({
    credentials: { token: null },
    dsb_credentials: {
      user: null,
      password: null,
    },
  });

  const cfg = new Config(config);
  cfg.save();
  return cfg;
}

export let config: Config;
export let initialized: boolean = false;

export async function init(
  options?: ConfigurationCreationOptions
): Promise<Config> {
  return (config = await createConfig(options));
}
