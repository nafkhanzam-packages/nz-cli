import fg from "fast-glob";
import * as tsm from "ts-morph";
const {ts} = tsm;
import {NzConfig} from "../config";
import {NzCommand} from "../nz-command";
import {utils} from "../utils";

const KEY = "gen-graphql-api";

type Conf = NonNullable<NzConfig[typeof KEY]>[number];

export default class GenUrls extends NzCommand {
  private project!: tsm.Project;
  private source!: tsm.SourceFile;
  private conf!: Conf;
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

  private async impl(conf: Conf): Promise<void> {
    this.conf = conf;
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

    const gqlInputTypes = this.getASTInputTypeObject(inputNodes);

    console.log(JSON.stringify(gqlInputTypes, null, 2));

    // return ``;
    return `
${nodes.map((v) => v.getFullText()).join("\n")}

const impl = ${fnNode.getFullText()}

export const ${variableName} = objectType({
  name: "${variableName}",
  definition(t) {
    t.field("${fieldName}", {
      type: "Boolean",
      args: {
        input: arg({
          type: inputObjectType({
            name: "${variableName}_input",
            definition(t) {
              t.field({
                name: "name",
                type: "String",
              });
            },
          }),
        }),
      },
    });
  },
});
    `;
  }

  private getASTInputTypeObject(
    inputNodes: tsm.Node<tsm.ts.Node>[],
  ): ASTInputTypeLiteral {
    const result: ASTInputType[] = [];
    for (const inputNode of inputNodes) {
      const name = inputNode.getSymbolOrThrow().getEscapedName();
      const typeNodes = inputNode.getChildren();
      let typeNode = typeNodes[typeNodes.length - 2];
      const isNullable = typeNodes.some((v) => this.isNullable(v));
      result.push([name, this.getASTInputType(typeNode, isNullable)]);
    }
    return {
      type: "object",
      value: result,
    };
  }

  private getASTInputType(
    typeNode: tsm.Node<tsm.ts.Node>,
    isNullable: boolean,
  ): ASTInputTypeLiteral {
    const isArray = typeNode.asKind(tsm.SyntaxKind.ArrayType);
    if (isArray) {
      typeNode = isArray.getChildAtIndex(0);
    }
    // console.log(typeNodes.map((v) => [v.getText(), v.getKindName()]));
    const opts: Partial<ASTInputTypeLiteral> = {
      isNullable,
      isArray: !!isArray,
    };
    const objectNode = typeNode.asKind(tsm.SyntaxKind.TypeLiteral);
    const unionNode = typeNode.asKind(tsm.SyntaxKind.UnionType);
    if (objectNode) {
      const nextInputNode = objectNode
        .getChildSyntaxListOrThrow()
        .getChildrenOfKind(tsm.SyntaxKind.PropertySignature);
      return {...opts, ...this.getASTInputTypeObject(nextInputNode)};
    } else if (unionNode) {
      return {...opts, ...this.getUnionInputType(unionNode)};
    } else {
      return {...opts, ...this.getASTInputTypeNonTypeLiteral(typeNode)};
    }
  }

  private isNullable(node: tsm.Node<tsm.ts.Node>) {
    return (
      node.asKind(tsm.SyntaxKind.QuestionToken) ||
      node
        .asKind(tsm.SyntaxKind.UnionType)
        ?.getTypeNodes()
        .some((v) => this.isNodeUndefinedOrNull(v))
    );
  }

  private isNodeUndefinedOrNull(node: tsm.Node<tsm.ts.Node>) {
    return (
      node
        .asKind(tsm.SyntaxKind.LiteralType)
        ?.getLiteral()
        .asKind(tsm.SyntaxKind.NullKeyword) ||
      node.asKind(tsm.SyntaxKind.UndefinedKeyword)
    );
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
        return this.getEnumInputType(enumNode);
      } else if (nextTypeNode) {
        const inputNodes = nextTypeNode
          .getChildrenOfKind(tsm.SyntaxKind.TypeLiteral)[0]
          .getChildSyntaxListOrThrow()
          .getChildrenOfKind(tsm.SyntaxKind.PropertySignature);
        return this.getASTInputTypeObject(inputNodes);
      } else {
        this.error(`Unimplemented type ${typeName}!`);
      }
    }
    return {
      type: "literal",
      value: typeNode.getKindName(),
    };
  }

  private getEnumInputType(enumNode: tsm.EnumDeclaration): ASTInputTypeLiteral {
    const enumNodes = enumNode
      .getChildSyntaxListOrThrow()
      .getChildrenOfKind(tsm.SyntaxKind.EnumMember);
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

  private getUnionInputType(unionNode: tsm.UnionTypeNode): ASTInputTypeLiteral {
    const filtered = unionNode
      .getTypeNodes()
      .filter((v) => !this.isNodeUndefinedOrNull(v));
    if (filtered.length === 1) {
      return this.getASTInputType(
        filtered[0],
        unionNode.getTypeNodes().some((v) => this.isNullable(v)),
      );
    }
    return {
      type: "enum",
      value: filtered.map((v) =>
        v
          .asKindOrThrow(tsm.SyntaxKind.LiteralType)
          .getLiteral()
          .asKindOrThrow(tsm.SyntaxKind.StringLiteral)
          .getLiteralValue(),
      ),
    };
  }
}
