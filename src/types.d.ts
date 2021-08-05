declare module "deep-sort-object" {
  export default function <T>(a: T): T;
}

type ASTInputTypeLiteral =
  | {
      type: "literal";
      value: string;
      isArray?: boolean;
      isNullable?: boolean;
    }
  | {
      type: "object";
      value: ASTInputType[];
      isArray?: boolean;
      isNullable?: boolean;
    }
  | {
      type: "enum";
      value: string[];
      isArray?: boolean;
      isNullable?: boolean;
    };

type ASTInputType = [string, ASTInputTypeLiteral];
