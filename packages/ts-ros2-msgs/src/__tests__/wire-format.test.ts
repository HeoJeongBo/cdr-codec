import { describe, expect, it } from "vitest";
import { Time } from "../builtin_interfaces";
import { Twist, Vector3 } from "../geometry_msgs";
import { ColorRGBA, Header } from "../std_msgs";

// Wire-format fixtures: hex strings that match the exact bytes a real ROS 2
// publisher emits over DDS for these messages (CDR_LE encapsulation).
//
// Header layout for every fixture:
//   byte 0: 0x00 (representation_identifier high)
//   byte 1: 0x01 (representation_identifier low — CDR_LE)
//   byte 2: 0x00 (representation_options high)
//   byte 3: 0x00 (representation_options low)
//
// Each test asserts both directions:
//   decode(hex) → expected JS value
//   encode(JS value) → exact hex (round-trip wire stability)

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(data: Uint8Array): string {
  return Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface Codec<T> {
  readonly name: string;
  encode(value: T): ArrayBuffer;
  decode(buffer: Uint8Array): T;
}

function checkWire<T>(codec: Codec<T>, value: T, hex: string): void {
  const expected = hex.replace(/\s/g, "").toLowerCase();
  const bytes = hexToBytes(hex);
  it(`${codec.name} — decode(hex) returns the JS value`, () => {
    expect(codec.decode(bytes)).toEqual(value);
  });
  it(`${codec.name} — encode(value) reproduces the same hex`, () => {
    expect(bytesToHex(new Uint8Array(codec.encode(value)))).toBe(expected);
  });
}

describe("wire-format fixtures", () => {
  // Time { sec: 0, nanosec: 0 } — 12 bytes total.
  // 00 01 00 00              encapsulation header (CDR_LE)
  // 00 00 00 00              int32 sec   = 0
  // 00 00 00 00              uint32 nanosec = 0
  checkWire(Time, { sec: 0, nanosec: 0 }, "00 01 00 00 00 00 00 00 00 00 00 00");

  // Time { sec: 1700000000, nanosec: 123456789 } — 12 bytes.
  // 00 F1 53 65   1700000000 = 0x6553F100, little-endian
  // 15 CD 5B 07   123456789  = 0x075BCD15, little-endian
  checkWire(
    Time,
    { sec: 1700000000, nanosec: 123456789 },
    "00 01 00 00 00 F1 53 65 15 CD 5B 07",
  );

  // Vector3 { x: 1.0, y: 2.0, z: 3.0 } — 28 bytes.
  // float64 needs 8-byte alignment from origin (= header end). At offset 4 the
  // alignment is already satisfied (4 - 4 = 0 mod 8), so no padding.
  // 1.0 = 0x3FF0000000000000 → LE: 00 00 00 00 00 00 F0 3F
  // 2.0 = 0x4000000000000000 → LE: 00 00 00 00 00 00 00 40
  // 3.0 = 0x4008000000000000 → LE: 00 00 00 00 00 00 08 40
  checkWire(
    Vector3,
    { x: 1.0, y: 2.0, z: 3.0 },
    "00 01 00 00 " +
      "00 00 00 00 00 00 F0 3F " +
      "00 00 00 00 00 00 00 40 " +
      "00 00 00 00 00 00 08 40",
  );

  // Twist { linear: (1,2,3), angular: (4,5,6) } — 52 bytes.
  // 4.0 = 0x4010_0000_0000_0000   LE: 00 00 00 00 00 00 10 40
  // 5.0 = 0x4014_0000_0000_0000   LE: 00 00 00 00 00 00 14 40
  // 6.0 = 0x4018_0000_0000_0000   LE: 00 00 00 00 00 00 18 40
  checkWire(
    Twist,
    {
      linear: { x: 1, y: 2, z: 3 },
      angular: { x: 4, y: 5, z: 6 },
    },
    "00 01 00 00 " +
      "00 00 00 00 00 00 F0 3F " +
      "00 00 00 00 00 00 00 40 " +
      "00 00 00 00 00 00 08 40 " +
      "00 00 00 00 00 00 10 40 " +
      "00 00 00 00 00 00 14 40 " +
      "00 00 00 00 00 00 18 40",
  );

  // Header { stamp: Time(1700000000, 0), frame_id: "map" } — 20 bytes.
  // 00 F1 53 65   sec
  // 00 00 00 00   nanosec
  // 04 00 00 00   uint32 string length (= byte length + null terminator)
  // 6D 61 70 00   "map\0"
  checkWire(
    Header,
    { stamp: { sec: 1700000000, nanosec: 0 }, frame_id: "map" },
    "00 01 00 00 " + "00 F1 53 65 " + "00 00 00 00 " + "04 00 00 00 " + "6D 61 70 00",
  );

  // ColorRGBA { r: 0.5, g: 0.25, b: 0.125, a: 1 } — 20 bytes (4 floats × 4).
  // 0.5   = 0x3F000000  LE: 00 00 00 3F
  // 0.25  = 0x3E800000  LE: 00 00 80 3E
  // 0.125 = 0x3E000000  LE: 00 00 00 3E
  // 1.0   = 0x3F800000  LE: 00 00 80 3F
  checkWire(
    ColorRGBA,
    { r: 0.5, g: 0.25, b: 0.125, a: 1 },
    "00 01 00 00 00 00 00 3F 00 00 80 3E 00 00 00 3E 00 00 80 3F",
  );
});
