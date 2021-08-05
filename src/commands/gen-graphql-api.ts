import fg from "fast-glob";
import * as tsm from "ts-morph";
const {ts} = tsm;
import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";
import {utils} from "../utils";

const KEY = "gen-graphql-api";

export default class GenUrls extends NzCommand {
  private project!: tsm.Project;
  private source!: tsm.SourceFile;
  override async run(): Promise<void> {
    this.project = new tsm.Project({
      tsConfigFilePath: "tsconfig.json",
    });

    const {flags} = this.parse(GenUrls);
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
    const {rootFolder, output} = conf;

    // Implementation
    const filterFg = [
      `${rootFolder}query/**/*.ts`,
      `${rootFolder}mutation/**/*.ts`,
    ];
    const rawEntries = await fg([...filterFg, `!**/_*`]);

    const result = await utils.readFileGlob(
      rootFolder,
      rawEntries,
      this.convertTsToImpl.bind(this),
    );

    const stringified = result.map((v) => v[1]).join("\n");

    await this.writeOutput(
      output,
      `
import {objectType, arg, inputObjectType} from "nexus";

${stringified}
    `,
    );
  }

  private convertTsToImpl(filePath: string, content: string): string {
    const {project} = this;

    const removedExt = utils.removeExtension(filePath);
    const variableName = removedExt.replace(/\//g, "_");
    const fieldName = removedExt.split("/").pop();

    this.source = project.createSourceFile("index.ts", content);

    const nodes: tsm.Node[] = [];
    const exportNode = this.source.getChildrenOfKind(
      tsm.SyntaxKind.ExportAssignment,
    )[0];
    const fnNode = exportNode.getFirstChildByKind(tsm.SyntaxKind.ArrowFunction);
    if (!fnNode) {
      this.error(
        `File ${filePath} does not have exported arrow function implementation!`,
      );
    }

    const inputName = fnNode
      .getParameters()[0]
      .getTypeNodeOrThrow()
      .asKindOrThrow(tsm.SyntaxKind.TypeReference)
      .getTypeName()
      .getSymbolOrThrow()
      .getEscapedName(); // Input

    const inputNodes = this.source
      .getTypeAliasOrThrow(inputName)
      .getChildrenOfKind(tsm.SyntaxKind.TypeLiteral)[0]
      .getChildSyntaxListOrThrow()
      .getChildrenOfKind(tsm.SyntaxKind.PropertySignature);

    const gqlInputTypes = this.getASTInputType(inputNodes);

    console.log(JSON.stringify(gqlInputTypes));

    return ``;
    //     return `
    // ${nodes.map((v) => v.getFullText()).join("\n")}

    // const impl = fnNode.getFullText()

    // export const ${variableName} = objectType({
    //   name: "${variableName}",
    //   definition(t) {
    //     t.field("${fieldName}", {
    //       type: "Boolean",
    //       args: {
    //         input: arg({
    //           type: inputObjectType({
    //             name: "${variableName}_input",
    //             definition(t) {
    //               t.field({
    //                 name: "name",
    //                 type: "String",
    //               });
    //             },
    //           }),
    //         }),
    //       },
    //     });
    //   },
    // });
    //     `;
  }

  private getASTInputType(
    inputNodes: tsm.Node<tsm.ts.Node>[],
  ): ASTInputTypeLiteral {
    const result: ASTInputType[] = [];
    for (const inputNode of inputNodes) {
      const name = inputNode.getSymbolOrThrow().getEscapedName();
      const typeNode = inputNode.getChildren()[2];
      const objectNode = typeNode.asKind(tsm.SyntaxKind.TypeLiteral);
      if (objectNode) {
        const nextInputNode = objectNode
          .getChildSyntaxListOrThrow()
          .getChildrenOfKind(tsm.SyntaxKind.PropertySignature);
        result.push([name, this.getASTInputType(nextInputNode)]);
      } else {
        result.push([name, this.getASTInputTypeNonTypeLiteral(typeNode)]);
      }
    }
    return {
      type: "object",
      value: result,
    };
  }

  private getASTInputTypeNonTypeLiteral(
    typeNode: tsm.Node<tsm.ts.Node>,
  ): ASTInputTypeLiteral {
    const typeRefNode = typeNode.asKind(tsm.SyntaxKind.TypeReference);
    if (typeRefNode) {
      const typeName = typeRefNode
        .getTypeName()
        .getSymbolOrThrow()
        .getEscapedName();
      const enumNode = this.source.getEnum(typeName);
      const nextTypeNode = this.source.getTypeAlias(typeName);
      if (enumNode) {
        const inputNodes = enumNode
          .getChildSyntaxListOrThrow()
          .getChildrenOfKind(tsm.SyntaxKind.EnumMember);
        return this.getEnumInputType(inputNodes);
      } else if (nextTypeNode) {
        const inputNodes = nextTypeNode
          .getChildrenOfKind(tsm.SyntaxKind.TypeLiteral)[0]
          .getChildSyntaxListOrThrow()
          .getChildrenOfKind(tsm.SyntaxKind.PropertySignature);
        return this.getASTInputType(inputNodes);
      } else {
        this.error(`Unimplemented type ${typeName}!`);
      }
    }
    return {
      type: "literal",
      value: typeNode.getKindName(),
    };
  }

  private getEnumInputType(enumNodes: tsm.EnumMember[]): ASTInputTypeLiteral {
    return {
      type: "enum",
      value: enumNodes.map((v) =>
        v
          .getChildAtIndex(2)
          .asKindOrThrow(tsm.SyntaxKind.StringLiteral)
          .getLiteralValue(),
      ),
    };
  }
}
