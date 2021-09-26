import { init as initConfig } from "./config";
import { init as initDatabase } from "./database";
import { init as initDSB } from "./dsb";
import { init as initToken } from "./token";

export interface InitializerOptions {
  configPath?: string;
  databasePath?: string;
}

export default async function init(options?: InitializerOptions) {
  await initConfig({ path: options?.configPath });
  await initDatabase({ path: options?.databasePath });
  await initToken();
  await initDSB();
}
