import sortObject from "deep-sort-object";
import fg from "fast-glob";
import _ from "lodash";
import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";

const KEY = "gen-urls";
const ARGS = "_";

export default class GenUrls extends NzCommand {
  override async run(): Promise<void> {
    const {flags} = this.parse(GenUrls);
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
    const {extensions, path, output} = conf;

    // Implementation
    const filterFg =
      extensions.length > 0
        ? extensions.map((v) => `${path}**/*.${v}`)
        : [`${path}**/*`];
    const rawEntries = await fg([...filterFg, `!**/_*`]);
    const result: Record<string, unknown> = {};
    for (const rawEntry of rawEntries) {
      let entry = rawEntry;
      for (const ext of extensions) {
        const dotext = `.${ext}`;
        if (entry.endsWith(dotext)) {
          entry = entry.substring(0, entry.length - dotext.length);
          break;
        }
      }
      const filePath = `${conf.prefix}${entry
        .substr(path.length - 1)
        .replace(/\/index$/, "")
        .replace(/^\//, "")}${conf.suffix}`;
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
    const matches = stringified.match(/"([^"]*)\[([^"]*)\]([^"]*)"/g) ?? [];
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

    await this.writeOutput(
      output,
      `export const ${conf.variable} = ${stringified}`,
    );
  }
}
