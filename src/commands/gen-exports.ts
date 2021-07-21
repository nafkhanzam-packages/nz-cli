import path from "path";
import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";
import chalk from "chalk";
import fg from "fast-glob";
import fs from "fs-extra";
import prettier from "prettier";

const KEY = "gen-exports";

export default class GenExports extends NzCommand {
  override async run(): Promise<void> {
    const {flags} = this.parse(GenExports);
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
    const {globs, output} = conf;

    // Implementation
    const rawEntries = await fg(globs);
    let res = "";
    for (const entry of rawEntries) {
      if (entry === output) {
        continue;
      }
      const {dir, name} = path.parse(
        path.relative(path.parse(output).dir, entry),
      );
      res += `export * from "./${path.normalize(`./${dir}/${name}`)}"\n`;
    }

    const prettierConfig = prettier.resolveConfig.sync(output);
    await fs.writeFile(
      output,
      prettier.format(res, {
        parser: "typescript",
        ...prettierConfig,
      }),
    );

    this.log(
      `Successfully written generated exports to ${chalk.yellow(output)}!`,
    );
  }
}
