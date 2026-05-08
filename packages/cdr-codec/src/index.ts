export { CdrReader } from "./entities/cdr-reader";
export {
  CdrSizeCalculator,
  type CdrSizeCalculatorOptions,
} from "./entities/cdr-size-calculator";
export { CdrWriter, type CdrWriterOptions } from "./entities/cdr-writer";
export {
  type CdrExtensibility,
  type CdrField,
  type CdrFieldType,
  type CdrPrimitiveType,
  type CdrValue,
  type DecodePlan,
  decodeWithPlan,
  type EncodeOptions,
  encodeWithPlan,
  fingerprintPlan,
  isPrimitiveType,
  schemaId,
} from "./features/decode-plan";
export {
  type EncapsulationFlags,
  EncapsulationKind,
  flagsForKind,
  isKnownKind,
} from "./shared/encapsulation";
