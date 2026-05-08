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
  | "string"
  | "wstring";

/**
 * XCDR2 struct extensibility kind.
 * - "final"      — fixed layout; no unknown-field skipping (default CDR1 behaviour).
 * - "appendable" — future fields may be appended; unknown trailing bytes are skipped.
 * - "mutable"    — fields identified by PID; any field may be absent or reordered.
 */
export type CdrExtensibility = "final" | "appendable" | "mutable";

export type CdrFieldType =
  | { readonly type: CdrPrimitiveType }
  | {
      readonly type: "fixed-array";
      readonly element: CdrFieldType;
      readonly length: number;
    }
  | { readonly type: "sequence"; readonly element: CdrFieldType }
  | {
      readonly type: "struct";
      readonly fields: readonly CdrField[];
      /** XCDR2 extensibility. Defaults to "final" when absent. */
      readonly extensibility?: CdrExtensibility;
    }
  | {
      /**
       * IDL union: read the discriminant first, then decode the matching variant.
       * `defaultVariant` is used when no case matches the discriminant.
       */
      readonly type: "union";
      readonly discriminant: CdrPrimitiveType;
      readonly variants: Readonly<Record<string | number, CdrFieldType>>;
      readonly defaultVariant?: CdrFieldType;
    };

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
  "wstring",
]);

export function isPrimitiveType(value: string): value is CdrPrimitiveType {
  return PRIMITIVE_TYPES.has(value);
}
