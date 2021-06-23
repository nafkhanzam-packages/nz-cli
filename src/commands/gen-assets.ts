import chalk from "chalk";
import {NzCommand} from "../nz-command";
import fg from "fast-glob";
import fs from "fs-extra";
import _ from "lodash";
import prettier from "prettier";
import {NzConfig} from "../config";
import {utils} from "../utils";
import sortObject from "deep-sort-object";

const KEY = "gen-assets";

export default class GenAssets extends NzCommand {
  override async run(): Promise<void> {
    const {flags} = this.parse(GenAssets);
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

    const prettierConfig = prettier.resolveConfig.sync(output);
    await fs.writeFile(
      output,
      prettier.format(
        `
          /**
          * THIS IS AUTOMATICALLY GENERATED USING @nafkhanzam/nz-cli.
          * DON'T CHANGE IT MANUALLY.
          */

          export const assets = ${JSON.stringify(sortedResult)}
        `,
        {
          parser: "typescript",
          ...prettierConfig,
        },
      ),
    );

    this.log(
      `Successfully written generated assets to ${chalk.yellow(output)}!`,
    );
  }
}
