import path from "path";
import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";
import * as exportGenerator from "export-generator";
import chalk from "chalk";

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
    const {base, dir} = path.parse(output);
    exportGenerator.generateExport({
      sourceGlobs: globs.map((v) => `${process.cwd()}/${v}`),
      outputDirectory: `${process.cwd()}/${dir}`,
      outputFileName: base,
    });
    this.log(
      `Successfully written generated exports to ${chalk.yellow(output)}!`,
    );
  }
}
