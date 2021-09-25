import readline from "./readline";
import { config, Config } from "./config";

class TokenManager {
  public constructor(private readonly config: Config) {}
  private async requestToken(): Promise<string> {
    return await this.requestTokenIteration().then((token: string) =>
      token.length > 0 ? token : this.requestToken()
    );
  }
  private async requestTokenIteration(): Promise<string> {
    return readline.question("Please specify the bot's token: ");
  }

  public async getToken(): Promise<string> {
    return (
      this.config.credentials.token ||
      (this.config.credentials.token = await this.requestToken())
    );
  }
}

export let token: TokenManager;

export function init() {
  token = new TokenManager(config);
}
