import _ from "lodash";
import fs from "fs-extra";

export const utils = {
  removeExtension: (filePath: string): string => {
    const arr = filePath.split(".");
    arr.splice(arr.length - 1, 1);
    return arr.join(".");
  },
  readFileGlob: async (
    rootFolder: string,
    entries: string[],
    convertFn: (path: string, content: string) => string,
  ): Promise<[string, string][]> => {
    const promises: Promise<string>[] = [];

    for (const entry of entries) {
      promises.push(
        new Promise<string>(async (resolve) => {
          const res = await fs.readFile(entry);
          resolve(res.toString("utf-8"));
        }),
      );
    }

    const readResults = await Promise.all(promises);

    const result: [string, string][] = [];

    for (let i = 0; i < entries.length; ++i) {
      const entryRaw = entries[i].substr(rootFolder.length);
      result.push([entryRaw, convertFn(entryRaw, readResults[i])]);
    }

    return result;
  },
};
