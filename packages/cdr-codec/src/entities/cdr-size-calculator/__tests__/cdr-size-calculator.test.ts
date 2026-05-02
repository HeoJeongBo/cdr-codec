import { describe, expect, it } from "vitest";
import { EncapsulationKind } from "../../../shared/encapsulation";
import { CdrWriter } from "../../cdr-writer";
import { CdrSizeCalculator } from "../index";

describe("CdrSizeCalculator", () => {
  it("matches CdrWriter byte count for primitives + string in CDR1 LE", () => {
    const calc = new CdrSizeCalculator();
    calc.int8();
    calc.uint8();
    calc.int16();
    calc.uint16();
    calc.int32();
    calc.uint32();
    calc.int64();
    calc.uint64();
    calc.float32();
    calc.float64();
    calc.boolean();
    calc.string(5);

    const w = new CdrWriter();
    w.int8(0)
      .uint8(0)
      .int16(0)
      .uint16(0)
      .int32(0)
      .uint32(0)
      .int64(0n)
      .uint64(0n)
      .float32(0)
      .float64(0)
      .boolean(false)
      .string("hello");

    expect(calc.size).toBe(w.byteOffset);
  });

  it("uses CDR2 (4-byte clamp) alignment for 64-bit values", () => {
    const calc = new CdrSizeCalculator({ kind: EncapsulationKind.CDR2_LE });
    calc.int8();
    calc.float64();

    const w = new CdrWriter({ kind: EncapsulationKind.CDR2_LE });
    w.int8(0).float64(0);
    expect(calc.size).toBe(w.byteOffset);
  });

  it("default kind is CDR1 (8-byte 64-bit alignment)", () => {
    const calc = new CdrSizeCalculator();
    calc.int8();
    calc.float64();
    expect(calc.isCDR2).toBe(false);
    expect(calc.size).toBe(20); // header(4) + int8(1) + pad(7) + float64(8) — CDR1 8-byte align
  });

  it("sequenceLength advances 4 bytes (uint32)", () => {
    const calc = new CdrSizeCalculator();
    expect(calc.sequenceLength()).toBe(8);
  });

  it("manual align is a no-op when already aligned", () => {
    const calc = new CdrSizeCalculator();
    calc.int32();
    expect(calc.align(4)).toBe(8);
  });
});
