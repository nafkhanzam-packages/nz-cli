import {IConfig} from "@oclif/config";
import {NzConfig} from "../../config";
import {NzCommand} from "../../nz-command";
import GenAssets from "./assets";
import GenClass from "./class";
import GenExports from "./exports";
import GenUrls from "./urls";

//! Unsafe type any
const COMMANDS: readonly (readonly [keyof NzConfig, any])[] = [
  ["gen-assets", GenAssets],
  ["gen-urls", GenUrls],
  ["gen-exports", GenExports],
  ["gen-class", GenClass],
];

export default class GenAll extends NzCommand {
  constructor(argv: string[], config: IConfig) {
    super(null, argv, config);
  }

  override async run(): Promise<void> {
    const promises: PromiseLike<unknown>[] = [];
    const {flags} = this.parse(GenAll);
    const [rootConf, confPath] = await this.readConfig(flags.config);
    for (const [command, CommandClazz] of COMMANDS) {
      if (rootConf[command]) {
        promises.push(CommandClazz.run(this.argv, this.config));
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    } else {
      this.warn(
        `No configuration set yet! Try creating "${confPath}" configuration file.`,
      );
    }
  }

  impl(conf: never): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
