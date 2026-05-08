import type { CdrFieldType } from "./decode-plan";

/**
 * Returns a deterministic canonical string that uniquely identifies a DecodePlan's structure.
 * Use as a schema compatibility key — if two codecs share the same schemaId, their wire
 * formats are identical.
 *
 * The string is stable across JS runtimes and field insertion order does not
 * affect struct canonicalization — fields are sorted by name before stringifying.
 */
export function schemaId(plan: CdrFieldType): string {
  return serialize(plan);
}

function serialize(t: CdrFieldType): string {
  switch (t.type) {
    case "int8":
    case "uint8":
    case "int16":
    case "uint16":
    case "int32":
    case "uint32":
    case "int64":
    case "uint64":
    case "float32":
    case "float64":
    case "boolean":
    case "string":
    case "wstring":
      return t.type;
    case "fixed-array":
      return `fixed-array[${t.length}]<${serialize(t.element)}>`;
    case "sequence":
      return `sequence<${serialize(t.element)}>`;
    case "struct": {
      const ext = t.extensibility ?? "final";
      const fields = [...t.fields]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => `${f.name}:${serialize(f.type)}`)
        .join(",");
      return `struct(${ext}){${fields}}`;
    }
    case "union": {
      const variants = Object.entries(t.variants)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${serialize(v)}`)
        .join(",");
      const def =
        t.defaultVariant != null ? `;default:${serialize(t.defaultVariant)}` : "";
      return `union(${t.discriminant}){${variants}${def}}`;
    }
  }
}
