import fg from "fast-glob";
import _ from "lodash";
import path from "path";
import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";

const KEY = "gen-class";

class ObjectGenerator {
  constructor(private obj: object | string, private isRoot = false) {}

  generate() {
    const assignSymbol = this.isRoot ? " = " : ": ";
    const endSymbol = this.isRoot ? ";" : ",";
    if (typeof this.obj === "object") {
      const strs: string[] = [];
      for (const [key, value] of Object.entries(this.obj)) {
        strs.push(
          `${key}${assignSymbol}${new ObjectGenerator(
            value,
          ).generate()}${endSymbol}`,
        );
      }
      return `{
        ${strs.sort().join("\n")}
      }`;
    } else {
      return this.obj;
    }
  }
}

export default class GenClass extends NzCommand {
  override async run(): Promise<void> {
    const {flags} = this.parse(GenClass);
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
    const {output, extensions, className} = conf;

    // Implementation
    const outputPath = path.parse(output);
    const filterFg =
      extensions.length > 0
        ? extensions.map((v) => `${outputPath.dir}/**/*.${v}`)
        : [`${outputPath.dir}/**/*`];
    const rawEntries = await fg([...filterFg, `!**/_*`]);
    const obj: object = {};
    const imports: string[] = [];
    for (const entry of rawEntries) {
      if (entry === output) {
        continue;
      }
      const {dir, name} = path.parse(path.relative(outputPath.dir, entry));
      const exportName = _.upperFirst(_.camelCase(name));
      imports.push(
        `import {${exportName}} from "./${path
          .normalize(`./${dir}/${name}`)
          .replace(/\\/, "/")}";`,
      );
      _.set(
        obj,
        `${dir.split("/").map(_.camelCase).join(".")}.${exportName}`,
        exportName,
      );
    }

    const res = `
      ${imports.sort().join("\n")}

      export class ${className} ${new ObjectGenerator(obj, true).generate()}
    `;

    await this.writeOutput(output, res);
  }
}
