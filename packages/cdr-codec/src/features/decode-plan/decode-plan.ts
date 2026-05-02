export type CdrPrimitiveType =
  | "int8"
  | "uint8"
  | "int16"
  | "uint16"
  | "int32"
  | "uint32"
  | "int64"
  | "uint64"
  | "float32"
  | "float64"
  | "boolean"
  | "string";

export type CdrFieldType =
  | { readonly type: CdrPrimitiveType }
  | {
      readonly type: "fixed-array";
      readonly element: CdrFieldType;
      readonly length: number;
    }
  | { readonly type: "sequence"; readonly element: CdrFieldType }
  | { readonly type: "struct"; readonly fields: readonly CdrField[] };

export interface CdrField {
  readonly name: string;
  readonly type: CdrFieldType;
}

export type DecodePlan = CdrFieldType;

export type CdrValue =
  | number
  | bigint
  | boolean
  | string
  | readonly CdrValue[]
  | { readonly [key: string]: CdrValue };

const PRIMITIVE_TYPES: ReadonlySet<string> = new Set([
  "int8",
  "uint8",
  "int16",
  "uint16",
  "int32",
  "uint32",
  "int64",
  "uint64",
  "float32",
  "float64",
  "boolean",
  "string",
]);

export function isPrimitiveType(value: string): value is CdrPrimitiveType {
  return PRIMITIVE_TYPES.has(value);
}
