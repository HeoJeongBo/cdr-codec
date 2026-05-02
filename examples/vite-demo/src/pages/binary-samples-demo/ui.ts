import { Time } from "@heojeongbo/ts-ros2-msgs/builtin_interfaces";
import { Twist, Vector3 } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";
import { ColorRGBA, Header } from "@heojeongbo/ts-ros2-msgs/std_msgs";
import { escapeHtml, hexDump } from "../../shared/lib";

// Same wire-format fixtures as packages/ts-ros2-msgs/src/__tests__/wire-format.test.ts.
// These are the exact bytes a real ROS 2 publisher emits for each message.
interface Sample {
  readonly codec: {
    name: string;
    encode(v: unknown): ArrayBuffer;
    decode(b: Uint8Array): unknown;
  };
  readonly value: unknown;
  readonly hex: string;
  readonly note: string;
}

const SAMPLES: Sample[] = [
  {
    codec: Time as never,
    value: { sec: 1700000000, nanosec: 123456789 },
    hex: "00 01 00 00 00 F1 53 65 15 CD 5B 07",
    note: "12 bytes: header + int32 sec + uint32 nanosec",
  },
  {
    codec: Vector3 as never,
    value: { x: 1.0, y: 2.0, z: 3.0 },
    hex:
      "00 01 00 00 " +
      "00 00 00 00 00 00 F0 3F " +
      "00 00 00 00 00 00 00 40 " +
      "00 00 00 00 00 00 08 40",
    note: "28 bytes: header + 3× float64 (already 8-byte aligned at offset 4)",
  },
  {
    codec: Twist as never,
    value: {
      linear: { x: 1, y: 2, z: 3 },
      angular: { x: 4, y: 5, z: 6 },
    },
    hex:
      "00 01 00 00 " +
      "00 00 00 00 00 00 F0 3F " +
      "00 00 00 00 00 00 00 40 " +
      "00 00 00 00 00 00 08 40 " +
      "00 00 00 00 00 00 10 40 " +
      "00 00 00 00 00 00 14 40 " +
      "00 00 00 00 00 00 18 40",
    note: "52 bytes: header + 2× Vector3 (linear, angular)",
  },
  {
    codec: Header as never,
    value: { stamp: { sec: 1700000000, nanosec: 0 }, frame_id: "map" },
    hex: "00 01 00 00 00 F1 53 65 00 00 00 00 04 00 00 00 6D 61 70 00",
    note: "20 bytes: header + Time + uint32 length + UTF-8 + null terminator",
  },
  {
    codec: ColorRGBA as never,
    value: { r: 0.5, g: 0.25, b: 0.125, a: 1 },
    hex: "00 01 00 00 00 00 00 3F 00 00 80 3E 00 00 00 3E 00 00 80 3F",
    note: "20 bytes: header + 4× float32",
  },
];

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(data: Uint8Array): string {
  return Array.from(data, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (
      !deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    ) {
      return false;
    }
  }
  return true;
}

function renderSample(s: Sample): string {
  const inputBytes = hexToBytes(s.hex);
  let decoded: unknown;
  let decodeError: string | null = null;
  try {
    decoded = s.codec.decode(inputBytes);
  } catch (err) {
    decodeError = err instanceof Error ? err.message : String(err);
  }

  let encodeHex = "";
  let encodeError: string | null = null;
  if (decoded !== undefined) {
    try {
      encodeHex = bytesToHex(new Uint8Array(s.codec.encode(decoded)));
    } catch (err) {
      encodeError = err instanceof Error ? err.message : String(err);
    }
  }

  const expectedHex = s.hex.replace(/\s/g, "").toLowerCase();
  const decodeOk = !decodeError && deepEqual(decoded, s.value);
  const encodeOk =
    !encodeError && encodeHex.replace(/\s/g, "").toLowerCase() === expectedHex;

  const passBadge = (ok: boolean) =>
    ok
      ? `<span style="color:#3fb950;font-weight:600">PASS ✓</span>`
      : `<span style="color:#f85149;font-weight:600">FAIL ✗</span>`;

  return `
    <section>
      <h3>${escapeHtml(s.codec.name)}</h3>
      <p style="color:#8b949e;font-size:12px;margin:4px 0 12px">${escapeHtml(s.note)}</p>

      <div style="display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:12px">
        <div style="color:#8b949e">wire input</div>
        <pre style="margin:0">${escapeHtml(hexDump(inputBytes, false))}</pre>

        <div style="color:#8b949e">decoded</div>
        <pre style="margin:0">${escapeHtml(
          decodeError ?? JSON.stringify(decoded, null, 2),
        )}</pre>

        <div style="color:#8b949e">expected</div>
        <pre style="margin:0">${escapeHtml(JSON.stringify(s.value, null, 2))}</pre>

        <div style="color:#8b949e">decode result</div>
        <div>${passBadge(decodeOk)}</div>

        <div style="color:#8b949e">encode → hex</div>
        <pre style="margin:0">${escapeHtml(
          encodeError ?? bytesToHex(hexToBytes(encodeHex)),
        )}</pre>

        <div style="color:#8b949e">re-encode result</div>
        <div>${passBadge(encodeOk)}</div>
      </div>
    </section>
  `;
}

export function renderBinarySamplesDemo(host: HTMLElement): void {
  const passCount = SAMPLES.filter((s) => {
    try {
      const decoded = s.codec.decode(hexToBytes(s.hex));
      const reencoded = bytesToHex(new Uint8Array(s.codec.encode(decoded)))
        .replace(/\s/g, "")
        .toLowerCase();
      return (
        deepEqual(decoded, s.value) &&
        reencoded === s.hex.replace(/\s/g, "").toLowerCase()
      );
    } catch {
      return false;
    }
  }).length;

  host.innerHTML = `
    <h2>ROS 2 binary message samples</h2>
    <p style="color:#8b949e;font-size:12px;margin:0 0 16px">
      Each sample below is the exact bytes a real ROS 2 publisher emits over DDS for the
      given value (CDR_LE encapsulation). For each: decode the wire bytes with
      <code>${"@heojeongbo/ts-ros2-msgs"}</code>, then re-encode the result and check
      that the bytes round-trip identically.
      <strong style="color:${
        passCount === SAMPLES.length ? "#3fb950" : "#f85149"
      }">${passCount} / ${SAMPLES.length} passing</strong>.
    </p>
    ${SAMPLES.map(renderSample).join("")}
  `;
}
