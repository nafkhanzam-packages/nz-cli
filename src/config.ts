import {zod} from "@nafkhanzam/common-utils";

export const nzConfigValidator = zod
  .object({
    "gen-assets": zod.array(
      zod.object({
        prefixPath: zod.string(),
        path: zod.string(),
        output: zod.string(),
        variable: zod.string().default("assets"),
      }),
    ),
    "gen-urls": zod.array(
      zod.object({
        path: zod.string(),
        output: zod.string(),
        extensions: zod.array(zod.string()).default([]),
        variable: zod.string().default("urls"),
        prefix: zod.string().default("/"),
        suffix: zod.string().default(""),
      }),
    ),
    "gen-exports": zod.array(
      zod.object({
        globs: zod.array(zod.string()),
        output: zod.string(),
      }),
    ),
    "gen-class": zod.array(
      zod.object({
        extensions: zod.string().array().default(["ts", "tsx"]),
        output: zod.string(),
        className: zod.string(),
        extendClass: zod
          .object({
            className: zod.string(),
            importFrom: zod.string(),
          })
          .optional(),
        prefixContent: zod.string().optional(),
        ignores: zod.string().array().default([]),
        fieldNameExceptionMap: zod.record(zod.string()).default({}),
        variableNameCase: zod
          .object({
            camel: zod.string().array(),
            pascal: zod.string().array(),
          })
          .partial()
          .default({}),
        imports: zod
          .object({
            value: zod.string(),
            path: zod.string(),
          })
          .array()
          .default([]),
      }),
    ),
  })
  .partial();

export type NzConfig = zod.infer<typeof nzConfigValidator>;

export const DEFAULT_CONFIG_PATH = "nz.json";
