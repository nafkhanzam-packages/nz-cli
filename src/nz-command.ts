import Command, {flags} from "@oclif/command";
import chalk from "chalk";
import _ from "lodash";
import fs from "fs-extra";
import prettier from "prettier";
import {DEFAULT_CONFIG_PATH, NzConfig, nzConfigValidator} from "./config";
import {IConfig} from "@oclif/config";

type InferKey<TKey extends keyof NzConfig | null> = TKey extends null
  ? never
  : TKey;

export abstract class NzCommand<
  TKey extends keyof NzConfig | null = null,
> extends Command {
  constructor(private key: TKey, argv: string[], config: IConfig) {
    super(argv, config);
  }

  override async run(): Promise<void> {
    if (this.key) {
      const {flags} = this.parse(NzCommand);
      const [rootConf, confPath] = await this.readConfig(flags.config);
      const confs = rootConf[this.key!];
      if (Array.isArray(confs)) {
        for (const conf of confs) {
          await this.impl(conf);
        }
      } else {
        this.configNotFoundError(this.key, confPath);
      }
    }
  }

  abstract impl(
    conf: NonNullable<NzConfig[InferKey<TKey>]>[number],
  ): Promise<void>;

  static flags = {
    config: flags.string({
      char: "c",
      description: "Configuration file path.",
    }),
  };

  validateConfig = (raw: unknown): NzConfig => {
    return nzConfigValidator.parse(raw);
  };

  readConfig = async (path?: string): Promise<[NzConfig, string]> => {
    let content = undefined;

    const pathOrDefault = path ?? DEFAULT_CONFIG_PATH;
    const doesConfigFileExist = await fs.pathExists(pathOrDefault);
    if (path || doesConfigFileExist) {
      if (doesConfigFileExist) {
        content = await fs.readJson(pathOrDefault);
      } else {
        this.error(`File configuration "${path}" is not found.`, {
          suggestions: [
            `Create "${path}" file with "{}" content.`,
            `Or remove --config flag (using default file "nz.json" if exists).`,
          ],
        });
      }
    }

    const res = this.validateConfig(content);
    return [res, pathOrDefault];
  };

  protected configNotFoundError = (key: string, confPath: string): void => {
    this.error(`${key} configuration is not found!`, {
      suggestions: [`Specify "${key}" configuration in the ${confPath} file!`],
    });
  };
  protected writeOutput = async (output: string, value: string) => {
    const exists = await fs.pathExists(output);
    if (!exists) {
      await fs.createFile(output);
    }

    let res = `
    /**
     * ! YOU'RE NOT SUPPOSED TO CHANGE THIS CONTENTS AS IT CAN BE REWRITTEN ON GENERATION!
     * ~ @nafkhanzam/nz-cli
     */

    ${value}
  `;

    try {
      const prettierConfig = prettier.resolveConfig.sync(output);
      res = prettier.format(res, {
        parser: "typescript",
        ...prettierConfig,
      });
    } catch (error) {
      console.error(error);
      this.warn(`Failed to format file with prettier!`);
    }

    await fs.writeFile(output, res);

    this.log(
      `Successfully written generated variable(s) to ${chalk.yellow(output)}!`,
    );
  };
}
