import sortObject from "deep-sort-object";
import fg from "fast-glob";
import _ from "lodash";
import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";
import {utils} from "../utils";

const KEY = "gen-assets";

export default class GenAssets extends NzCommand {
  override async run(): Promise<void> {
    const {flags} = this.parse(GenAssets);
    const [rootConf, confPath] = await this.readConfig(flags.config);
    const confs = rootConf[KEY];
    if (confs) {
      for (const conf of confs) {
        this.impl(conf);
      }
    } else {
      this.configNotFoundError(KEY, confPath);
    }
  }

  private async impl(
    conf: NonNullable<NzConfig[typeof KEY]>[number],
  ): Promise<void> {
    const {prefixPath, path, output} = conf;

    // Implementation
    const rawEntries = await fg(`${path}**/*`);
    const result: Record<string, unknown> = {};
    for (const entry of rawEntries) {
      const filePath = `${prefixPath}${entry.substr(path.length)}`;
      const objPath = utils
        .removeExtension(entry)
        .substr(path.length)
        .split("/")
        .map(_.camelCase)
        .map((v) => (v.match(/^\d(.*)/) ? `_${v}` : v));
      _.set(result, objPath, filePath);
    }

    const sortedResult = sortObject(result);

    const stringified = JSON.stringify(sortedResult);

    await this.writeOutput(
      output,
      `export const ${conf.variable} = ${stringified}`,
    );
  }
}
