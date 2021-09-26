import { init as initConfig } from "./config";
import { init as initToken } from "./token";
import { init as initDSB } from "./dsb";

export interface InitializerOptions {
  configPath?: string;
}

export default async function init(options?: InitializerOptions) {
  await initConfig({ path: options?.configPath });
  await initToken();
  await initDSB();
}
