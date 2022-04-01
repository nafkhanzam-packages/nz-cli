import {IConfig} from "@oclif/config";
import fg from "fast-glob";
import _ from "lodash";
import path from "path";
import {NzConfig} from "../../config";
import {NzCommand} from "../../nz-command";

const KEY = "gen-class";

export default class GenClass extends NzCommand<typeof KEY> {
  constructor(argv: string[], config: IConfig) {
    super(KEY, argv, config);
  }

  override async impl(
    conf: NonNullable<NzConfig[typeof KEY]>[number],
  ): Promise<void> {
    const {
      output,
      extensions,
      className,
      extendClass,
      prefixContent,
      ignores,
      fieldNameExceptionMap,
      imports,
      variableNameCase,
    } = conf;

    const variableNameMap = (name: string) => {
      if (
        (variableNameCase.camel ?? []).some((v) => new RegExp(v).test(name))
      ) {
        return _.camelCase(name);
      }
      return _.upperFirst(_.camelCase(name));
    };

    // Implementation
    const outputPath = path.parse(output);
    const filterFg =
      extensions.length > 0
        ? extensions.map((v) => `${outputPath.dir}/**/*.${v}`)
        : [`${outputPath.dir}/**/*`];
    const rawEntries = await fg([
      ...filterFg,
      `!**/_*`,
      ...ignores.map((v) => `!${v}`),
    ]);
    const obj: object = {};
    const importArr: string[] = [];

    for (const v of imports) {
      importArr.push(`import ${v.value} from "${v.path}";`);
    }

    let extendStr = ``;
    if (extendClass) {
      importArr.push(
        `import {${extendClass.className}} from "${extendClass.importFrom}";`,
      );
      extendStr = ` extends ${extendClass.className}`;
    }

    for (const entry of rawEntries) {
      if (entry === output) {
        continue;
      }
      const {dir, name} = path.parse(path.relative(outputPath.dir, entry));
      const exportName = fieldNameExceptionMap[name] ?? variableNameMap(name);
      importArr.push(
        `import {${exportName}} from "./${path
          .normalize(`./${dir}/${name}`)
          .replace(/\\/, "/")}";`,
      );
      const dirarr = dir.split("/").filter((v) => !!v);
      let varPath: string;
      if (dirarr.length) {
        varPath = `${dirarr.map(_.camelCase).join(".")}.${exportName}`;
      } else {
        varPath = exportName;
      }
      _.set(obj, varPath, exportName);
    }

    const res = `
      ${importArr.sort().join("\n")}

      export class ${className}${extendStr} ${new ObjectGenerator(obj, {
      isRoot: true,
      prefixContent,
    }).generate()}
    `;

    await this.writeOutput(output, res);
  }
}

class ObjectGenerator {
  constructor(
    private obj: object | string,
    private opts?: {
      isRoot?: boolean;
      prefixContent?: string;
    },
  ) {}

  generate() {
    const prefixContent = this.opts?.prefixContent;
    const isRoot = !!this.opts?.isRoot;
    const assignSymbol = isRoot ? " = " : ": ";
    const endSymbol = isRoot ? ";" : ",";
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
        ${prefixContent ? `${prefixContent}\n` : ""}
        ${strs.sort().join("\n")}
      }`;
    } else {
      return this.obj;
    }
  }
}
