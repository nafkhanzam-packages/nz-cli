import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";
import GenAssets from "./gen-assets";
import GenExports from "./gen-exports";
import GenUrls from "./gen-urls";

const COMMANDS: readonly (readonly [keyof NzConfig, typeof NzCommand])[] = [
  ["gen-assets", GenAssets],
  ["gen-exports", GenExports],
  ["gen-urls", GenUrls],
];

export default class GenAll extends NzCommand {
  async run(): Promise<void> {
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
}