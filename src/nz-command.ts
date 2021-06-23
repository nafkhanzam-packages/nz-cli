import {validatorUtils} from "@nafkhanzam/common-utils";
import Command from "@oclif/command";
import * as fs from "fs-extra";
import {DEFAULT_CONFIG_PATH, NzConfig, nzConfigValidator} from "./config";

export abstract class NzCommand extends Command {
  validateConfig = (raw: unknown): NzConfig => {
    return validatorUtils.validate(nzConfigValidator, raw);
  };

  readConfig = async (path?: string): Promise<[NzConfig, string]> => {
    let content = {};

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
}
