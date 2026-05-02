import { describe, expect, it } from "vitest";
import { EncapsulationKind } from "../../../shared/encapsulation";
import { CdrReader } from "../../cdr-reader";
import { CdrWriter } from "../index";

describe("CdrWriter constructor", () => {
  it("writes the encapsulation header (kind in byte 1)", () => {
    const writer = new CdrWriter({ kind: EncapsulationKind.CDR_BE });
    const data = writer.data;
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(EncapsulationKind.CDR_BE);
    expect(data[2]).toBe(0);
    expect(data[3]).toBe(0);
    expect(writer.byteOffset).toBe(4);
  });

  it("defaults to CDR_LE when no kind specified", () => {
    const writer = new CdrWriter();
    expect(writer.kind).toBe(EncapsulationKind.CDR_LE);
    expect(writer.littleEndian).toBe(true);
    expect(writer.isCDR2).toBe(false);
  });

  it("respects custom initial size", () => {
    const writer = new CdrWriter({ size: 1024 });
    expect(writer.toArrayBuffer().byteLength).toBe(4);
    expect(writer.data.byteLength).toBe(4);
  });

  it("clamps size to header minimum", () => {
    const writer = new CdrWriter({ size: 1 });
    expect(writer.byteOffset).toBe(4);
  });

  it("accepts a pre-allocated buffer", () => {
    const buf = new ArrayBuffer(64);
    const writer = new CdrWriter({ buffer: buf, kind: EncapsulationKind.CDR_LE });
    writer.int32(42);
    const reader = new CdrReader(writer.data);
    expect(reader.int32()).toBe(42);
  });

  it("rejects pre-allocated buffer smaller than the header", () => {
    expect(() => new CdrWriter({ buffer: new ArrayBuffer(2) })).toThrow(/too small/);
  });
});

describe("CdrWriter primitives + alignment", () => {
  it("round-trips every primitive across LE/BE × CDR1/CDR2", () => {
    const matrix: EncapsulationKind[] = [
      EncapsulationKind.CDR_LE,
      EncapsulationKind.CDR_BE,
      EncapsulationKind.CDR2_LE,
      EncapsulationKind.CDR2_BE,
    ];

    for (const kind of matrix) {
      const w = new CdrWriter({ kind });
      w.int8(-12)
        .uint8(200)
        .int16(-12345)
        .uint16(54321)
        .int32(-1_234_567)
        .uint32(3_000_000_000)
        .int64(-9_000_000_000_000_000n)
        .uint64(18_000_000_000_000_000n)
        .float32(1.5)
        .float64(Math.E)
        .boolean(true)
        .boolean(false);

      const r = new CdrReader(w.data);
      expect(r.int8()).toBe(-12);
      expect(r.uint8()).toBe(200);
      expect(r.int16()).toBe(-12345);
      expect(r.uint16()).toBe(54321);
      expect(r.int32()).toBe(-1_234_567);
      expect(r.uint32()).toBe(3_000_000_000);
      expect(r.int64()).toBe(-9_000_000_000_000_000n);
      expect(r.uint64()).toBe(18_000_000_000_000_000n);
      expect(r.float32()).toBeCloseTo(1.5);
      expect(r.float64()).toBeCloseTo(Math.E);
      expect(r.boolean()).toBe(true);
      expect(r.boolean()).toBe(false);
    }
  });

  it("manual align(n) pads to alignment", () => {
    const w = new CdrWriter({ kind: EncapsulationKind.CDR_LE });
    w.int8(1);
    w.align(4);
    expect(w.byteOffset).toBe(8);
    w.align(4);
    expect(w.byteOffset).toBe(8);
  });
});

describe("CdrWriter buffer growth", () => {
  it("doubles capacity when exceeded", () => {
    const w = new CdrWriter({ size: 16, kind: EncapsulationKind.CDR_LE });
    for (let i = 0; i < 100; i++) {
      w.int32(i);
    }
    expect(w.byteOffset).toBe(4 + 100 * 4);
    const r = new CdrReader(w.data);
    for (let i = 0; i < 100; i++) {
      expect(r.int32()).toBe(i);
    }
  });

  it("grows to fit string padding when alignment crosses capacity", () => {
    const w = new CdrWriter({ size: 8, kind: EncapsulationKind.CDR_LE });
    w.int8(1);
    w.float64(99.99);
    const r = new CdrReader(w.data);
    expect(r.int8()).toBe(1);
    expect(r.float64()).toBeCloseTo(99.99);
  });

  it("doubles capacity multiple times in one write when needed", () => {
    const w = new CdrWriter({ size: 8, kind: EncapsulationKind.CDR_LE });
    const big = "x".repeat(1000);
    w.string(big);
    expect(new CdrReader(w.data).string()).toBe(big);
  });
});

describe("CdrWriter strings", () => {
  it("writes empty string as length=1 + null", () => {
    const w = new CdrWriter({ kind: EncapsulationKind.CDR_LE });
    w.string("");
    expect(Array.from(w.data.slice(4))).toEqual([1, 0, 0, 0, 0]);
  });

  it("round-trips multibyte UTF-8", () => {
    const w = new CdrWriter({ kind: EncapsulationKind.CDR_LE });
    w.string("héllo 🌍");
    expect(new CdrReader(w.data).string()).toBe("héllo 🌍");
  });
});

describe("CdrWriter typed arrays", () => {
  it("writes all variants with and without length prefix", () => {
    const w = new CdrWriter({ kind: EncapsulationKind.CDR_LE });
    w.int8Array([1, 2]);
    w.uint8Array([1, 2]);
    w.int16Array([1, 2]);
    w.uint16Array([1, 2]);
    w.int32Array([1, 2]);
    w.uint32Array([1, 2]);
    w.int64Array([1n, 2n]);
    w.uint64Array([1n, 2n]);
    w.float32Array([1, 2]);
    w.float64Array([1, 2]);
    w.int8Array([3, 4], false);
    w.uint8Array([3, 4], false);
    w.int16Array([3, 4], false);
    w.uint16Array([3, 4], false);
    w.int32Array([3, 4], false);
    w.uint32Array([3, 4], false);
    w.int64Array([3n, 4n], false);
    w.uint64Array([3n, 4n], false);
    w.float32Array([3, 4], false);
    w.float64Array([3, 4], false);

    const r = new CdrReader(w.data);
    expect(Array.from(r.int8Array())).toEqual([1, 2]);
    expect(Array.from(r.uint8Array())).toEqual([1, 2]);
    expect(Array.from(r.int16Array())).toEqual([1, 2]);
    expect(Array.from(r.uint16Array())).toEqual([1, 2]);
    expect(Array.from(r.int32Array())).toEqual([1, 2]);
    expect(Array.from(r.uint32Array())).toEqual([1, 2]);
    expect(Array.from(r.int64Array())).toEqual([1n, 2n]);
    expect(Array.from(r.uint64Array())).toEqual([1n, 2n]);
    expect(Array.from(r.float32Array())).toEqual([1, 2]);
    expect(Array.from(r.float64Array())).toEqual([1, 2]);
    expect(Array.from(r.int8Array(2))).toEqual([3, 4]);
    expect(Array.from(r.uint8Array(2))).toEqual([3, 4]);
    expect(Array.from(r.int16Array(2))).toEqual([3, 4]);
    expect(Array.from(r.uint16Array(2))).toEqual([3, 4]);
    expect(Array.from(r.int32Array(2))).toEqual([3, 4]);
    expect(Array.from(r.uint32Array(2))).toEqual([3, 4]);
    expect(Array.from(r.int64Array(2))).toEqual([3n, 4n]);
    expect(Array.from(r.uint64Array(2))).toEqual([3n, 4n]);
    expect(Array.from(r.float32Array(2))).toEqual([3, 4]);
    expect(Array.from(r.float64Array(2))).toEqual([3, 4]);
  });

  it("toArrayBuffer returns a sliced copy of the written portion", () => {
    const w = new CdrWriter({ kind: EncapsulationKind.CDR_LE });
    w.int32(7);
    const buf = w.toArrayBuffer();
    expect(buf.byteLength).toBe(8);
    expect(new CdrReader(new Uint8Array(buf)).int32()).toBe(7);
  });
});
