import { describe, expect, it } from "vitest";
import { EncapsulationKind } from "../../../shared/encapsulation";
import { CdrWriter } from "../../cdr-writer";
import { CdrReader } from "../index";

function buildBuffer(
  kind: EncapsulationKind,
  fill: (writer: CdrWriter) => void,
): Uint8Array {
  const writer = new CdrWriter({ kind });
  fill(writer);
  return writer.data;
}

describe("CdrReader constructor", () => {
  it("rejects buffers smaller than the encapsulation header", () => {
    expect(() => new CdrReader(new Uint8Array(3))).toThrow(/too small/);
  });

  it("rejects unknown encapsulation kind in header byte", () => {
    const buf = new Uint8Array([0, 0xff, 0, 0]);
    expect(() => new CdrReader(buf)).toThrow(/Unknown encapsulation kind/);
  });

  it("captures kind, endianness, CDR2 flag from header", () => {
    const buf = buildBuffer(EncapsulationKind.CDR2_BE, () => undefined);
    const reader = new CdrReader(buf);
    expect(reader.kind).toBe(EncapsulationKind.CDR2_BE);
    expect(reader.littleEndian).toBe(false);
    expect(reader.isCDR2).toBe(true);
    expect(reader.byteOffset).toBe(4);
    expect(reader.byteLength).toBe(buf.byteLength);
  });
});

describe("CdrReader primitives", () => {
  it("reads signed/unsigned 8/16/32-bit integers (little-endian)", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.int8(-1)
        .uint8(255)
        .int16(-1234)
        .uint16(40000)
        .int32(-100000)
        .uint32(4_000_000_000);
    });
    const r = new CdrReader(buf);
    expect(r.int8()).toBe(-1);
    expect(r.uint8()).toBe(255);
    expect(r.int16()).toBe(-1234);
    expect(r.uint16()).toBe(40000);
    expect(r.int32()).toBe(-100000);
    expect(r.uint32()).toBe(4_000_000_000);
  });

  it("reads signed/unsigned 64-bit integers and floats (big-endian)", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_BE, (w) => {
      w.int64(-9_000_000_000_000_000n)
        .uint64(18_000_000_000_000_000n)
        .float32(-0.5)
        .float64(Math.PI);
    });
    const r = new CdrReader(buf);
    expect(r.int64()).toBe(-9_000_000_000_000_000n);
    expect(r.uint64()).toBe(18_000_000_000_000_000n);
    expect(r.float32()).toBeCloseTo(-0.5);
    expect(r.float64()).toBeCloseTo(Math.PI);
  });

  it("reads booleans (true/false)", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.boolean(true).boolean(false);
    });
    const r = new CdrReader(buf);
    expect(r.boolean()).toBe(true);
    expect(r.boolean()).toBe(false);
  });
});

describe("CdrReader strings", () => {
  it("reads empty string with length=1", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.string("");
    });
    expect(new CdrReader(buf).string()).toBe("");
  });

  it("reads ASCII strings", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.string("hello");
    });
    expect(new CdrReader(buf).string()).toBe("hello");
  });

  it("reads multibyte UTF-8", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.string("안녕 🤖");
    });
    expect(new CdrReader(buf).string()).toBe("안녕 🤖");
  });

  it("treats length=0 as empty string", () => {
    const data = new Uint8Array(8);
    data[1] = EncapsulationKind.CDR_LE;
    expect(new CdrReader(data).string()).toBe("");
  });
});

describe("CdrReader typed arrays", () => {
  it("reads typed arrays with length prefix when count omitted", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.int8Array([-1, 2, -3]);
      w.uint8Array([1, 2, 3]);
      w.int16Array([-100, 100]);
      w.uint16Array([200, 300]);
      w.int32Array([-1, 2]);
      w.uint32Array([1, 2]);
      w.int64Array([-1n, 2n]);
      w.uint64Array([1n, 2n]);
      w.float32Array([0.5, -0.25]);
      w.float64Array([1.5, -2.5]);
    });
    const r = new CdrReader(buf);
    expect(Array.from(r.int8Array())).toEqual([-1, 2, -3]);
    expect(Array.from(r.uint8Array())).toEqual([1, 2, 3]);
    expect(Array.from(r.int16Array())).toEqual([-100, 100]);
    expect(Array.from(r.uint16Array())).toEqual([200, 300]);
    expect(Array.from(r.int32Array())).toEqual([-1, 2]);
    expect(Array.from(r.uint32Array())).toEqual([1, 2]);
    expect(Array.from(r.int64Array())).toEqual([-1n, 2n]);
    expect(Array.from(r.uint64Array())).toEqual([1n, 2n]);
    expect(Array.from(r.float32Array())).toEqual([0.5, -0.25]);
    expect(Array.from(r.float64Array())).toEqual([1.5, -2.5]);
  });

  it("reads typed arrays with explicit fixed count (no length prefix)", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.int8Array([-1, 2], false);
      w.uint8Array([1, 2], false);
      w.int16Array([1, 2], false);
      w.uint16Array([1, 2], false);
      w.int32Array([1, 2], false);
      w.uint32Array([1, 2], false);
      w.int64Array([1n, 2n], false);
      w.uint64Array([1n, 2n], false);
      w.float32Array([1, 2], false);
      w.float64Array([1, 2], false);
    });
    const r = new CdrReader(buf);
    expect(Array.from(r.int8Array(2))).toEqual([-1, 2]);
    expect(Array.from(r.uint8Array(2))).toEqual([1, 2]);
    expect(Array.from(r.int16Array(2))).toEqual([1, 2]);
    expect(Array.from(r.uint16Array(2))).toEqual([1, 2]);
    expect(Array.from(r.int32Array(2))).toEqual([1, 2]);
    expect(Array.from(r.uint32Array(2))).toEqual([1, 2]);
    expect(Array.from(r.int64Array(2))).toEqual([1n, 2n]);
    expect(Array.from(r.uint64Array(2))).toEqual([1n, 2n]);
    expect(Array.from(r.float32Array(2))).toEqual([1, 2]);
    expect(Array.from(r.float64Array(2))).toEqual([1, 2]);
  });
});

describe("CdrReader alignment", () => {
  it("aligns 64-bit values to 8 bytes in CDR1", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.int8(1); // offset 4 → 5
      w.float64(2.5); // aligns to origin+8 → offset 12, then +8 → 20
    });
    expect(buf.byteLength).toBe(20);
    const r = new CdrReader(buf);
    expect(r.int8()).toBe(1);
    expect(r.float64()).toBe(2.5);
  });

  it("clamps 8-byte alignment to 4 bytes in CDR2", () => {
    const buf = buildBuffer(EncapsulationKind.CDR2_LE, (w) => {
      w.int8(1); // offset 4 → 5
      w.float64(2.5); // CDR2: aligns to 4 → offset 8
    });
    expect(buf.byteLength).toBe(16);
    const r = new CdrReader(buf);
    expect(r.int8()).toBe(1);
    expect(r.float64()).toBe(2.5);
  });

  it("manual align is a no-op when already aligned", () => {
    const buf = buildBuffer(EncapsulationKind.CDR_LE, (w) => {
      w.int32(1);
      w.align(4);
      w.int32(2);
    });
    const r = new CdrReader(buf);
    expect(r.int32()).toBe(1);
    r.align(4);
    expect(r.int32()).toBe(2);
  });
});
