import * as zod from "zod";

export const nzConfigValidator = zod
  .object({
    "check-package": zod
      .array(
        zod.object({
          packageJsonPath: zod.string().default("package.json"),
          checkLevel: zod.enum(["exact", "minor", "major"]).default("major"),
          exceptions: zod.string().array().default([]),
        }),
      )
      .default([{}]),
    "gen-assets": zod
      .array(
        zod.object({
          prefixPath: zod.string(),
          path: zod.string(),
          output: zod.string(),
          variable: zod.string().default("assets"),
        }),
      )
      .default([]),
    "gen-urls": zod
      .array(
        zod.object({
          path: zod.string(),
          output: zod.string(),
          extensions: zod.array(zod.string()).default([]),
          variable: zod.string().default("urls"),
          prefix: zod.string().default("/"),
          suffix: zod.string().default(""),
        }),
      )
      .default([]),
    "gen-exports": zod
      .array(
        zod.object({
          globs: zod.array(zod.string()),
          output: zod.string(),
        }),
      )
      .default([]),
    "gen-class": zod
      .array(
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
      )
      .default([]),
  })
  .partial()
  .default({
    "check-package": [{}],
  });

export type NzConfig = zod.infer<typeof nzConfigValidator>;

export const DEFAULT_CONFIG_PATH = "nz.json";
