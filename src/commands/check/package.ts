import {IConfig} from "@oclif/config";
import chalk from "chalk";
import fs from "fs-extra";
import {NzConfig} from "../../config";
import {NzCommand} from "../../nz-command";

type Config = NonNullable<NzConfig[typeof KEY]>[number];

const KEY = "check-package";

const mapper: [Config["checkLevel"], RegExp][] = [
  ["exact", /^[0-9]/],
  ["minor", /^~/],
  ["major", /^\^/],
];

export default class CheckPackage extends NzCommand<typeof KEY> {
  constructor(argv: string[], config: IConfig) {
    super(KEY, argv, config);
  }

  override async impl(conf: Config): Promise<void> {
    const {checkLevel, exceptions, packageJsonPath} = conf;

    const pkgStr = await fs.readFile(packageJsonPath);
    const pkg = JSON.parse(String(pkgStr));

    const entries = [
      Object.entries(pkg["dependencies"]),
      Object.entries(pkg["devDependencies"]),
    ].flat();

    for (const [key, value] of entries) {
      if (exceptions.includes(key)) {
        this.log(`Skipping ${key}...`);
        continue;
      }

      let strict = false;
      let regexpToCheckList: RegExp[] = [];
      for (const [level, regexp] of mapper) {
        if (!strict) {
          regexpToCheckList.push(regexp);
          if (level === checkLevel) {
            strict = true;
          }
        }
        if (
          strict &&
          regexpToCheckList.every(
            (regexpToCheck) => !regexpToCheck.test(String(value)),
          )
        ) {
          console.log(regexpToCheckList);
          throw this.error(
            new Error(
              chalk.redBright(
                `Checking "${packageJsonPath}" failed! Found "${key}" with "${value}" which doesn't fulfill "${checkLevel}" strictness.`,
              ),
            ),
          );
        }
      }
    }

    this.log(
      chalk.greenBright(
        chalk.bold(`Check for "${packageJsonPath}" succeeded!`),
      ),
    );
  }
}
