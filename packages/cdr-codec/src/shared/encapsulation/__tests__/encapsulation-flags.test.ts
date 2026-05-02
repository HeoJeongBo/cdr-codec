import { describe, expect, it } from "vitest";
import { EncapsulationKind, flagsForKind, isKnownKind } from "../index";

describe("flagsForKind", () => {
  const cases: ReadonlyArray<{
    kind: EncapsulationKind;
    littleEndian: boolean;
    isCDR2: boolean;
  }> = [
    { kind: EncapsulationKind.CDR_BE, littleEndian: false, isCDR2: false },
    { kind: EncapsulationKind.CDR_LE, littleEndian: true, isCDR2: false },
    { kind: EncapsulationKind.PL_CDR_BE, littleEndian: false, isCDR2: false },
    { kind: EncapsulationKind.PL_CDR_LE, littleEndian: true, isCDR2: false },
    { kind: EncapsulationKind.CDR2_BE, littleEndian: false, isCDR2: true },
    { kind: EncapsulationKind.CDR2_LE, littleEndian: true, isCDR2: true },
    { kind: EncapsulationKind.PL_CDR2_BE, littleEndian: false, isCDR2: true },
    { kind: EncapsulationKind.PL_CDR2_LE, littleEndian: true, isCDR2: true },
    {
      kind: EncapsulationKind.DELIMITED_CDR2_BE,
      littleEndian: false,
      isCDR2: true,
    },
    {
      kind: EncapsulationKind.DELIMITED_CDR2_LE,
      littleEndian: true,
      isCDR2: true,
    },
  ];

  for (const { kind, littleEndian, isCDR2 } of cases) {
    it(`maps ${EncapsulationKind[kind]} to LE=${littleEndian} CDR2=${isCDR2}`, () => {
      expect(flagsForKind(kind)).toEqual({ littleEndian, isCDR2 });
    });
  }

  it("throws on unknown kind", () => {
    expect(() => flagsForKind(0xff as EncapsulationKind)).toThrow(
      /Unsupported encapsulation kind: 0xff/,
    );
  });
});

describe("isKnownKind", () => {
  it("accepts all known kinds", () => {
    for (const value of Object.values(EncapsulationKind)) {
      if (typeof value === "number") {
        expect(isKnownKind(value)).toBe(true);
      }
    }
  });

  it("rejects unknown kinds", () => {
    expect(isKnownKind(0xff)).toBe(false);
    expect(isKnownKind(0x99)).toBe(false);
  });
});
