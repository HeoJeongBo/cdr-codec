import { EncapsulationKind } from "./encapsulation-kind";

export interface EncapsulationFlags {
  readonly littleEndian: boolean;
  readonly isCDR2: boolean;
}

export function flagsForKind(kind: EncapsulationKind): EncapsulationFlags {
  switch (kind) {
    case EncapsulationKind.CDR_BE:
    case EncapsulationKind.PL_CDR_BE:
      return { littleEndian: false, isCDR2: false };
    case EncapsulationKind.CDR_LE:
    case EncapsulationKind.PL_CDR_LE:
      return { littleEndian: true, isCDR2: false };
    case EncapsulationKind.CDR2_BE:
    case EncapsulationKind.PL_CDR2_BE:
    case EncapsulationKind.DELIMITED_CDR2_BE:
      return { littleEndian: false, isCDR2: true };
    case EncapsulationKind.CDR2_LE:
    case EncapsulationKind.PL_CDR2_LE:
    case EncapsulationKind.DELIMITED_CDR2_LE:
      return { littleEndian: true, isCDR2: true };
    default:
      throw new Error(
        `Unsupported encapsulation kind: 0x${(kind as number).toString(16).padStart(2, "0")}`,
      );
  }
}

export function isKnownKind(value: number): value is EncapsulationKind {
  return (
    value === EncapsulationKind.CDR_BE ||
    value === EncapsulationKind.CDR_LE ||
    value === EncapsulationKind.PL_CDR_BE ||
    value === EncapsulationKind.PL_CDR_LE ||
    value === EncapsulationKind.CDR2_BE ||
    value === EncapsulationKind.CDR2_LE ||
    value === EncapsulationKind.PL_CDR2_BE ||
    value === EncapsulationKind.PL_CDR2_LE ||
    value === EncapsulationKind.DELIMITED_CDR2_BE ||
    value === EncapsulationKind.DELIMITED_CDR2_LE
  );
}
