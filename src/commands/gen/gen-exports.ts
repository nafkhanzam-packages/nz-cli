import {IConfig} from "@oclif/config";
import fg from "fast-glob";
import path from "path";
import {NzConfig} from "../../config";
import {NzCommand} from "../../nz-command";

const KEY = "gen-exports";

export default class GenExports extends NzCommand<typeof KEY> {
  constructor(argv: string[], config: IConfig) {
    super(KEY, argv, config);
  }

  override async impl(
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
      res += `export * from "./${path
        .normalize(`./${dir}/${name}`)
        .replace(/\\/, "/")}"\n`;
    }

    await this.writeOutput(output, res);
  }
}
