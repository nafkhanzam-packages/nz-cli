import {zod} from "@nafkhanzam/common-utils";

export const nzConfigValidator = zod
  .object({
    "gen-assets": zod.object({
      prefixPath: zod.string(),
      path: zod.string(),
      output: zod.string(),
    }),
    "gen-urls": zod.object({
      path: zod.string(),
      output: zod.string(),
    }),
  })
  .partial();

export type NzConfig = zod.infer<typeof nzConfigValidator>;

export const DEFAULT_CONFIG_PATH = "nz.json";
