import { CdrReader } from "../../entities/cdr-reader";
import { type CdrFieldType, type DecodePlan, isPrimitiveType } from "./decode-plan";

export function decodeWithPlan(plan: DecodePlan, buffer: ArrayBufferView): unknown {
  const reader = new CdrReader(buffer);
  return readField(reader, plan);
}

export function readField(reader: CdrReader, type: CdrFieldType): unknown {
  if (isPrimitiveType(type.type)) {
    return readPrimitive(reader, type.type);
  }
  if (type.type === "fixed-array") {
    const result: unknown[] = new Array(type.length);
    for (let i = 0; i < type.length; i++) {
      result[i] = readField(reader, type.element);
    }
    return result;
  }
  if (type.type === "sequence") {
    const length = reader.sequenceLength();
    const result: unknown[] = new Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = readField(reader, type.element);
    }
    return result;
  }
  if (type.type === "struct") {
    const result: Record<string, unknown> = {};
    for (const field of type.fields) {
      result[field.name] = readField(reader, field.type);
    }
    return result;
  }
  throw new Error(`Unknown CDR field type: ${(type as { type: string }).type}`);
}

function readPrimitive(reader: CdrReader, type: string): unknown {
  switch (type) {
    case "int8":
      return reader.int8();
    case "uint8":
      return reader.uint8();
    case "int16":
      return reader.int16();
    case "uint16":
      return reader.uint16();
    case "int32":
      return reader.int32();
    case "uint32":
      return reader.uint32();
    case "int64":
      return reader.int64();
    case "uint64":
      return reader.uint64();
    case "float32":
      return reader.float32();
    case "float64":
      return reader.float64();
    case "boolean":
      return reader.boolean();
    case "string":
      return reader.string();
    /* c8 ignore next 2 */
    default:
      throw new Error(`Unknown primitive: ${type}`);
  }
}
