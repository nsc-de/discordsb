const DSB = require("dsbapi");
import readline from "./readline";
import { config, Config } from "./config";
import cheerio from "cheerio";
import axios from "axios";

class DSBCredentialsManager {
  public constructor(private readonly config: Config) {}
  private async requestUser(): Promise<string> {
    return await this.requestUserIteration().then((token: string) =>
      token.length > 0 ? token : this.requestUser()
    );
  }
  private async requestUserIteration(): Promise<string> {
    return readline.question("Please specify the dsb-mobile user: ");
  }
  public async getUser(): Promise<string> {
    return (
      this.config.dsb_credentials.user ||
      (this.config.dsb_credentials.user = await this.requestUser())
    );
  }

  private async requestPassword(): Promise<string> {
    return await this.requestPasswordIteration().then((token: string) =>
      token.length > 0 ? token : this.requestPassword()
    );
  }
  private async requestPasswordIteration(): Promise<string> {
    return readline.question("Please specify the dsb-mobile password: ");
  }

  public async getPassword(): Promise<string> {
    return (
      this.config.dsb_credentials.password ||
      (this.config.dsb_credentials.password = await this.requestPassword())
    );
  }
}

export let dsb_credentials: DSBCredentialsManager;

export interface DSBEntry {
  date: string;
  type: string;
  group: string;
  time: string;
  subject: string;
  room: string;
  text: string;
}

export interface RemappedDSBEntry {
  date: Date;
  type: string;
  group: string;
  subgroup: string;
  time: string;
  from: number;
  to: number;
  subject: string;
  room: string;
  text?: string;
}

export async function init() {
  dsb_credentials = new DSBCredentialsManager(config);
}

export async function fetchData(): Promise<DSBEntry[]> {
  const dsb = new DSB(
    await dsb_credentials.getUser(),
    await dsb_credentials.getPassword()
  );

  const data = await dsb.fetch();
  const tiles = DSB.findMethodInData("tiles", data);
  const entries: DSBEntry[] = [];

  await Promise.all(
    tiles.data[0].objects.map(async ({ url }: any) => {
      await axios.get(url).then((e) => {
        const $ = cheerio.load(e.data);

        const date = $("div.mon_title").text();
        $("table.mon_list tr.list.odd, table.mon_list tr.list.even").each(
          function () {
            const list: string[] = [];
            $(this)
              .children("td.list")
              .each(function () {
                list.push($(this).text());
              });

            entries.push({
              date: date,
              type: list[0],
              group: list[1],
              time: list[2],
              subject: list[3],
              room: list[4],
              text: list[7],
            });
          }
        );
      });
    })
  );
  return entries;
}

function remapData(data: DSBEntry[]): RemappedDSBEntry[] {
  return data.map((d) => ({
    date: (() => {
      const p = d.date.split(" ")[0].split(".");
      return new Date(`${p[2]}-${p[1]}-${p[0]}`);
    })(),
    type: d.type,
    group: d.group,
    subgroup: isNumeric(d.group) ? d.subject : d.group,
    time: d.time,
    from: d.time.includes("-") ? +d.time.split("-")[0] : +d.time,
    to: d.time.includes("-") ? +d.time.split("-")[1] : +d.time,
    subject: d.subject,
    room: d.room,
    ...(() => (d.room ? { room: d.room } : {}))(),
  }));
}

export function fetchRemappedData(): Promise<RemappedDSBEntry[]> {
  return fetchData().then(remapData);
}

function isNumeric(str: string) {
  if (typeof str != "string") return false;
  return !isNaN(+str);
}
