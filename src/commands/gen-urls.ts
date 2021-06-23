import chalk from "chalk";
import {NzCommand} from "../nz-command";
import fg from "fast-glob";
import fs from "fs-extra";
import _ from "lodash";
import prettier from "prettier";
import {NzConfig} from "../config";
import {utils} from "../utils";
import sortObject from "deep-sort-object";

const KEY: keyof NzConfig = "gen-urls";

export default class GenUrls extends NzCommand {
  override async run(): Promise<void> {
    const {flags} = this.parse(GenUrls);
    const [rootConf, confPath] = await this.readConfig(flags.config);
    const conf = rootConf[KEY];
    if (conf) {
      this.impl(conf);
    } else {
      this.error(`${KEY} configuration is not found!`, {
        suggestions: [
          `Specify "${KEY}" configuration in the ${confPath} file!`,
        ],
      });
    }
  }

  private async impl(conf: NonNullable<NzConfig[typeof KEY]>): Promise<void> {
    const {path, output} = conf;

    // Implementation
    const rawEntries = await fg([`${path}**/*`, `!**/_*`]);
    const result: Record<string, unknown> = {};
    for (const rawEntry of rawEntries) {
      const entry = utils.removeExtension(rawEntry);
      const filePath = entry.substr(path.length - 1);
      const objPath = entry
        .substr(path.length)
        .split("/")
        .map(_.camelCase)
        .map((v) => (v.match(/^\d(.*)/) ? `_${v}` : v));
      _.set(result, objPath, filePath.replace(/\/index$/, "/"));
    }

    const sortedResult = sortObject(result);

    const prettierConfig = prettier.resolveConfig.sync(output);
    await fs.writeFile(
      output,
      prettier.format(
        `
          /**
          * THIS IS AUTOMATICALLY GENERATED USING @nafkhanzam/nz-cli.
          * DON'T CHANGE IT MANUALLY.
          */

          export const urls = ${JSON.stringify(sortedResult)}
        `,
        {
          parser: "typescript",
          ...prettierConfig,
        },
      ),
    );

    this.log(`Successfully written generated urls to ${chalk.yellow(output)}!`);
  }
}
