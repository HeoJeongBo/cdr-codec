import { CdrWriter } from "../../entities/cdr-writer";
import { type EncapsulationKind } from "../../shared/encapsulation";
import { type CdrFieldType, type DecodePlan, isPrimitiveType } from "./decode-plan";

export interface EncodeOptions {
  readonly kind?: EncapsulationKind;
  readonly initialSize?: number;
}

export function encodeWithPlan(
  plan: DecodePlan,
  value: unknown,
  options: EncodeOptions = {},
): ArrayBuffer {
  const writer = new CdrWriter({ kind: options.kind, size: options.initialSize });
  writeField(writer, plan, value);
  return writer.toArrayBuffer();
}

export function writeField(writer: CdrWriter, type: CdrFieldType, value: unknown): void {
  if (isPrimitiveType(type.type)) {
    writePrimitive(writer, type.type, value);
    return;
  }
  if (type.type === "fixed-array") {
    if (!Array.isArray(value)) {
      throw new Error(`Expected array for fixed-array, got ${typeof value}`);
    }
    if (value.length !== type.length) {
      throw new Error(
        `Fixed-array length mismatch: expected ${type.length}, got ${value.length}`,
      );
    }
    for (let i = 0; i < type.length; i++) {
      writeField(writer, type.element, value[i]);
    }
    return;
  }
  if (type.type === "sequence") {
    if (!Array.isArray(value)) {
      throw new Error(`Expected array for sequence, got ${typeof value}`);
    }
    writer.sequenceLength(value.length);
    for (const element of value) {
      writeField(writer, type.element, element);
    }
    return;
  }
  if (type.type === "struct") {
    if (typeof value !== "object" || value === null) {
      throw new Error(
        `Expected object for struct, got ${value === null ? "null" : typeof value}`,
      );
    }
    const record = value as Record<string, unknown>;
    const extensibility = type.extensibility ?? "final";

    if (extensibility === "appendable" && writer.isCDR2) {
      // XCDR2 appendable: write DHEADER placeholder, then fields, then patch.
      writer.align(4);
      const headerOffset = writer.byteOffset;
      writer.uint32(0); // placeholder
      const bodyStart = writer.byteOffset;
      for (const field of type.fields) {
        writeField(writer, field.type, record[field.name]);
      }
      // Patch DHEADER with actual byte count.
      const bodyBytes = writer.byteOffset - bodyStart;
      const view = new DataView((writer as unknown as { buffer: ArrayBuffer }).buffer);
      view.setUint32(headerOffset, bodyBytes, writer.littleEndian);
      return;
    }

    for (const field of type.fields) {
      writeField(writer, field.type, record[field.name]);
    }
    return;
  }
  if (type.type === "union") {
    if (typeof value !== "object" || value === null) {
      throw new Error(
        `Expected object for union, got ${value === null ? "null" : typeof value}`,
      );
    }
    const rec = value as Record<string, unknown>;
    writePrimitive(writer, type.discriminant, rec["discriminant"]);
    const key = String(rec["discriminant"]);
    const variant = type.variants[key] ?? type.defaultVariant;
    if (variant == null) {
      throw new Error(`CDR union: no variant for discriminant ${key}`);
    }
    writeField(writer, variant, rec["value"]);
    return;
  }
  throw new Error(`Unknown CDR field type: ${(type as { type: string }).type}`);
}

function writePrimitive(writer: CdrWriter, type: string, value: unknown): void {
  switch (type) {
    case "int8":
      writer.int8(value as number);
      return;
    case "uint8":
      writer.uint8(value as number);
      return;
    case "int16":
      writer.int16(value as number);
      return;
    case "uint16":
      writer.uint16(value as number);
      return;
    case "int32":
      writer.int32(value as number);
      return;
    case "uint32":
      writer.uint32(value as number);
      return;
    case "int64":
      writer.int64(value as bigint);
      return;
    case "uint64":
      writer.uint64(value as bigint);
      return;
    case "float32":
      writer.float32(value as number);
      return;
    case "float64":
      writer.float64(value as number);
      return;
    case "boolean":
      writer.boolean(value as boolean);
      return;
    case "string":
      writer.string(value as string);
      return;
    case "wstring":
      writer.wstring(value as string);
      return;
    /* c8 ignore next 2 */
    default:
      throw new Error(`Unknown primitive: ${type}`);
  }
}
