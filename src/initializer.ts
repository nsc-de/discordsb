import { init as initConfig } from "./config";
import { init as initToken } from "./token";

export interface InitializerOptions {
  configPath?: string;
}

export default async function init(options?: InitializerOptions) {
  await initConfig({ path: options?.configPath });
  initToken();
}
