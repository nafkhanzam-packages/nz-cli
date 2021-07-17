import {zod} from "@nafkhanzam/common-utils";

export const nzConfigValidator = zod
  .object({
    "gen-assets": zod.array(
      zod.object({
        prefixPath: zod.string(),
        path: zod.string(),
        output: zod.string(),
      }),
    ),
    "gen-urls": zod.array(
      zod.object({
        path: zod.string(),
        output: zod.string(),
        extensions: zod.array(zod.string()).optional(),
      }),
    ),
    "gen-exports": zod.array(
      zod.object({
        globs: zod.array(zod.string()),
        output: zod.string(),
      }),
    ),
  })
  .partial();

export type NzConfig = zod.infer<typeof nzConfigValidator>;

export const DEFAULT_CONFIG_PATH = "nz.json";
