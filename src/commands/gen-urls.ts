import chalk from "chalk";
import {NzCommand} from "../nz-command";
import fg from "fast-glob";
import fs from "fs-extra";
import _ from "lodash";
import prettier from "prettier";
import {NzConfig} from "../config";
import {utils} from "../utils";
import sortObject from "deep-sort-object";

const KEY = "gen-urls";
const ARGS = "_";

export default class GenUrls extends NzCommand {
  override async run(): Promise<void> {
    const {flags} = this.parse(GenUrls);
    const [rootConf, confPath] = await this.readConfig(flags.config);
    const conf = rootConf[KEY];
    if (conf) {
      this.impl(conf);
    } else {
      this.configNotFoundError(KEY, confPath);
    }
  }

  private async impl(conf: NonNullable<NzConfig[typeof KEY]>): Promise<void> {
    const {path, output} = conf;

    // Implementation
    const extensions = conf.extensions ?? [""];
    const rawEntries = await fg([
      ...extensions.map((v) => `${path}**/*.${v}`),
      `!**/_*`,
    ]);
    const result: Record<string, unknown> = {};
    for (const rawEntry of rawEntries) {
      let cutEntry = rawEntry;
      for (const ext of extensions) {
        cutEntry = cutEntry.replace(ext, "");
      }
      const entry = utils.removeExtension(cutEntry);
      const filePath =
        entry.substr(path.length - 1).replace(/\/index$/, "") + "/";
      const objPath = entry
        .substr(path.length)
        .split("/")
        .map(_.camelCase)
        .map((v) => (v.match(/^\d(.*)/) ? `_${v}` : v));
      _.set(result, objPath, filePath);
    }

    const sortedResult = sortObject(result);
    let stringified = JSON.stringify(sortedResult);

    // Replacing to functions
    const matches = stringified.match(/"\/([^"]*)\[([^"]*)\]([^"]*)\/"/g) ?? [];
    for (const match of matches) {
      let result = match.replace(/"/g, "`");
      const slugMatches = result.match(/\[(.*?)\]/g) ?? [];
      const slugMatchesWithContent = slugMatches.map((v) => [
        v,
        v.replace(/\[(.*?)\]/g, "$1"),
      ]);
      for (const [slugMatch, content] of slugMatchesWithContent) {
        result = result.replace(slugMatch, `\${${ARGS}.${content}}`);
      }
      const paramTypeString = slugMatchesWithContent
        .map(([_, content]) => `${content}: string`)
        .join(", ");
      const fnString = `(${ARGS}: {${paramTypeString}}) => ${result}`;
      stringified = stringified.replace(match, fnString);
    }

    const prettierConfig = prettier.resolveConfig.sync(output);
    await fs.writeFile(
      output,
      prettier.format(
        `
        /**
        * THIS IS AUTOMATICALLY GENERATED USING @nafkhanzam/nz-cli.
        * DON'T CHANGE IT MANUALLY.
        */

        export const urls = ${stringified}
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
