import { describe, expect, it } from "vitest";
import { CdrReader } from "../../../entities/cdr-reader";
import { CdrWriter } from "../../../entities/cdr-writer";
import {
  type CdrFieldType,
  type DecodePlan,
  decodeWithPlan,
  encodeWithPlan,
  isPrimitiveType,
  readField,
  writeField,
} from "../index";

describe("isPrimitiveType", () => {
  it("recognizes all CDR primitives", () => {
    for (const t of [
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
    ]) {
      expect(isPrimitiveType(t)).toBe(true);
    }
  });

  it("rejects unknown types", () => {
    expect(isPrimitiveType("struct")).toBe(false);
    expect(isPrimitiveType("frobnicate")).toBe(false);
  });
});

describe("encodeWithPlan + decodeWithPlan", () => {
  it("round-trips every primitive type", () => {
    const plan: DecodePlan = {
      type: "struct",
      fields: [
        { name: "i8", type: { type: "int8" } },
        { name: "u8", type: { type: "uint8" } },
        { name: "i16", type: { type: "int16" } },
        { name: "u16", type: { type: "uint16" } },
        { name: "i32", type: { type: "int32" } },
        { name: "u32", type: { type: "uint32" } },
        { name: "i64", type: { type: "int64" } },
        { name: "u64", type: { type: "uint64" } },
        { name: "f32", type: { type: "float32" } },
        { name: "f64", type: { type: "float64" } },
        { name: "b", type: { type: "boolean" } },
        { name: "s", type: { type: "string" } },
      ],
    };
    const value = {
      i8: -1,
      u8: 200,
      i16: -1000,
      u16: 50000,
      i32: -2_000_000,
      u32: 3_000_000_000,
      i64: -9_999_999_999_999n,
      u64: 9_999_999_999_999n,
      f32: 0.5,
      f64: 1.25,
      b: true,
      s: "hello",
    };
    const buf = encodeWithPlan(plan, value);
    const decoded = decodeWithPlan(plan, new Uint8Array(buf)) as typeof value;
    expect(decoded).toEqual(value);
  });

  it("round-trips fixed-array, sequence, and nested struct", () => {
    const plan: DecodePlan = {
      type: "struct",
      fields: [
        {
          name: "rgb",
          type: {
            type: "fixed-array",
            length: 3,
            element: { type: "uint8" },
          },
        },
        {
          name: "labels",
          type: { type: "sequence", element: { type: "string" } },
        },
        {
          name: "pose",
          type: {
            type: "struct",
            fields: [
              { name: "x", type: { type: "float64" } },
              { name: "y", type: { type: "float64" } },
            ],
          },
        },
      ],
    };
    const value = {
      rgb: [10, 20, 30],
      labels: ["a", "b", "c"],
      pose: { x: 1.0, y: 2.0 },
    };
    const buf = encodeWithPlan(plan, value);
    expect(decodeWithPlan(plan, new Uint8Array(buf))).toEqual(value);
  });

  it("respects encode options: kind + initialSize", () => {
    const plan: DecodePlan = { type: "uint32" };
    const buf = encodeWithPlan(plan, 42, {
      kind: 0x00,
      initialSize: 16,
    });
    const view = new Uint8Array(buf);
    expect(view[1]).toBe(0x00); // CDR_BE
    expect(view.slice(4)).toEqual(new Uint8Array([0, 0, 0, 0x2a]));
  });
});

describe("plan error paths", () => {
  it("throws when a fixed-array value is not an array", () => {
    const plan: DecodePlan = {
      type: "fixed-array",
      length: 2,
      element: { type: "uint8" },
    };
    expect(() => encodeWithPlan(plan, "nope")).toThrow(/Expected array/);
  });

  it("throws when a fixed-array length mismatches", () => {
    const plan: DecodePlan = {
      type: "fixed-array",
      length: 2,
      element: { type: "uint8" },
    };
    expect(() => encodeWithPlan(plan, [1, 2, 3])).toThrow(/length mismatch/);
  });

  it("throws when a sequence value is not an array", () => {
    const plan: DecodePlan = {
      type: "sequence",
      element: { type: "uint8" },
    };
    expect(() => encodeWithPlan(plan, "x")).toThrow(/Expected array/);
  });

  it("throws when a struct value is null/non-object", () => {
    const plan: DecodePlan = {
      type: "struct",
      fields: [{ name: "x", type: { type: "uint8" } }],
    };
    expect(() => encodeWithPlan(plan, null)).toThrow(/Expected object/);
    expect(() => encodeWithPlan(plan, 5)).toThrow(/Expected object/);
  });

  it("throws on unknown CDR field type (encode + decode)", () => {
    const bogus = { type: "frobnicate" } as unknown as CdrFieldType;
    expect(() => encodeWithPlan(bogus, 1)).toThrow(/Unknown CDR field type/);
    const w = new CdrWriter();
    w.int32(0);
    expect(() => readField(new CdrReader(w.data), bogus)).toThrow(
      /Unknown CDR field type/,
    );
  });

  it("writeField/readField helpers are reachable directly", () => {
    const w = new CdrWriter();
    writeField(w, { type: "uint16" }, 7);
    const r = new CdrReader(w.data);
    expect(readField(r, { type: "uint16" })).toBe(7);
  });
});
