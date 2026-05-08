import { fingerprintPlan } from "@heojeongbo/cdr-codec";
import { createCodec } from "@heojeongbo/ts-ros2-msgs";
import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";
import { hexDump } from "../../shared/lib";

// ---------------------------------------------------------------------------
// 1. Schema fingerprint — compatibility check
// ---------------------------------------------------------------------------

// Simulate a "publisher" and "subscriber" with slightly different schemas.
// Same logical type but the publisher has an extra field (newer version).
const PublisherStatus = createCodec("demo/Status", {
  type: "struct",
  fields: [
    { name: "id", type: { type: "uint32" } },
    { name: "name", type: { type: "string" } },
    { name: "active", type: { type: "boolean" } },
  ],
});

const SubscriberStatus = createCodec("demo/Status", {
  type: "struct",
  fields: [
    { name: "id", type: { type: "uint32" } },
    { name: "name", type: { type: "string" } },
    // subscriber is on an older version — missing "active"
  ],
});

// ---------------------------------------------------------------------------
// 2. wstring (UTF-16) round-trip
// ---------------------------------------------------------------------------

interface LocalizedLabel {
  id: number;
  label: string; // wstring in IDL
  fallback: string; // regular utf-8 string
}

const LocalizedLabel = createCodec<LocalizedLabel>("demo/LocalizedLabel", {
  type: "struct",
  fields: [
    { name: "id", type: { type: "uint32" } },
    { name: "label", type: { type: "wstring" } },
    { name: "fallback", type: { type: "string" } },
  ],
});

const LABEL_VALUE: LocalizedLabel = {
  id: 42,
  label: "로봇 상태 메시지 — ロボット — Roboter",
  fallback: "robot_status",
};

// ---------------------------------------------------------------------------
// 3. Union type
// ---------------------------------------------------------------------------

interface SensorReading {
  discriminant: number;
  value: { temperature: number } | { pressure: number } | { label: string };
}

const SensorReading = createCodec<SensorReading>("demo/SensorReading", {
  type: "union",
  discriminant: "int32",
  variants: {
    0: { type: "struct", fields: [{ name: "temperature", type: { type: "float32" } }] },
    1: { type: "struct", fields: [{ name: "pressure", type: { type: "float64" } }] },
  },
  defaultVariant: {
    type: "struct",
    fields: [{ name: "label", type: { type: "string" } }],
  },
});

const SENSOR_CASES: Array<{ label: string; value: SensorReading }> = [
  {
    label: "discriminant=0 → temperature",
    value: { discriminant: 0, value: { temperature: 36.6 } },
  },
  {
    label: "discriminant=1 → pressure",
    value: { discriminant: 1, value: { pressure: 101325.0 } },
  },
  {
    label: "discriminant=99 → default (label)",
    value: { discriminant: 99, value: { label: "unknown_sensor" } },
  },
];

// ---------------------------------------------------------------------------
// 4. XCDR2 appendable struct — forward compatibility
// ---------------------------------------------------------------------------
// Encoder writes the newer (v2) schema with DHEADER.
// Decoder uses the older (v1) schema — unknown trailing bytes are skipped.

import { decodeWithPlan, EncapsulationKind, encodeWithPlan } from "@heojeongbo/cdr-codec";

const planV1 = {
  type: "struct" as const,
  extensibility: "appendable" as const,
  fields: [
    { name: "x", type: { type: "float64" as const } },
    { name: "y", type: { type: "float64" as const } },
  ],
};

const planV2 = {
  type: "struct" as const,
  extensibility: "appendable" as const,
  fields: [
    { name: "x", type: { type: "float64" as const } },
    { name: "y", type: { type: "float64" as const } },
    { name: "z", type: { type: "float64" as const } }, // new field in v2
    { name: "label", type: { type: "string" as const } }, // new field in v2
  ],
};

const v2Value = { x: 1.0, y: 2.0, z: 3.0, label: "new_robot" };

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const MUTED = { color: "#8b949e" } as const;
const PASS = { color: "#3fb950", fontWeight: 600 } as const;
const FAIL = { color: "#f85149", fontWeight: 600 } as const;
const GRID = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: "6px 12px",
  fontSize: 12,
  marginTop: 12,
} as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div style={MUTED}>{label}</div>
      <div>{children}</div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Section 1: fingerprint
// ---------------------------------------------------------------------------

function FingerprintSection() {
  const fp1 = PublisherStatus.fingerprint;
  const fp2 = SubscriberStatus.fingerprint;
  const builtInFp = Twist.fingerprint;
  const match = fp1 === fp2;

  return (
    <section>
      <h3>1. Schema fingerprint</h3>
      <p style={{ ...MUTED, fontSize: 12, margin: "4px 0 10px" }}>
        <code>fingerprintPlan(plan)</code> produces a deterministic string from the
        DecodePlan. Use it to detect publisher/subscriber schema mismatches at runtime.
      </p>
      <div style={GRID}>
        <Row label="publisher fp">
          <pre style={{ margin: 0, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
            {fp1}
          </pre>
        </Row>
        <Row label="subscriber fp">
          <pre style={{ margin: 0, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
            {fp2}
          </pre>
        </Row>
        <Row label="match?">
          <span style={match ? PASS : FAIL}>
            {match ? "MATCH ✓" : "MISMATCH ✗ — schema versions differ"}
          </span>
        </Row>
        <Row label="Twist fp">
          <pre style={{ margin: 0, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
            {builtInFp}
          </pre>
        </Row>
        <Row label="raw call">
          <pre
            style={{ margin: 0 }}
          >{`fingerprintPlan(Twist.plan)\n// "${builtInFp}"`}</pre>
        </Row>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2: wstring
// ---------------------------------------------------------------------------

function WstringSection() {
  let buffer: ArrayBuffer | null = null;
  let decoded: LocalizedLabel | null = null;
  let error: string | null = null;
  try {
    buffer = LocalizedLabel.encode(LABEL_VALUE);
    decoded = LocalizedLabel.decode(new Uint8Array(buffer)) as LocalizedLabel;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const ok =
    !error &&
    decoded?.label === LABEL_VALUE.label &&
    decoded?.fallback === LABEL_VALUE.fallback;

  return (
    <section>
      <h3>2. wstring (UTF-16) support</h3>
      <p style={{ ...MUTED, fontSize: 12, margin: "4px 0 10px" }}>
        IDL <code>wstring</code> uses UTF-16LE on the wire with a 4-byte byte-count prefix
        and 2-byte null terminator — distinct from the regular UTF-8 <code>string</code>.
      </p>
      <pre>{`const LocalizedLabel = createCodec<LocalizedLabel>("demo/LocalizedLabel", {
  type: "struct",
  fields: [
    { name: "id",       type: { type: "uint32" } },
    { name: "label",    type: { type: "wstring" } },  // UTF-16LE
    { name: "fallback", type: { type: "string" } },   // UTF-8
  ],
});`}</pre>
      <div style={GRID}>
        <Row label="source value">
          <pre style={{ margin: 0 }}>{JSON.stringify(LABEL_VALUE, null, 2)}</pre>
        </Row>
        <Row label="wire bytes">
          <pre style={{ margin: 0 }}>
            {buffer ? hexDump(new Uint8Array(buffer), false) : (error ?? "")}
          </pre>
        </Row>
        <Row label="decoded">
          <pre style={{ margin: 0 }}>
            {decoded ? JSON.stringify(decoded, null, 2) : "—"}
          </pre>
        </Row>
        <Row label="round-trip">
          <span style={ok ? PASS : FAIL}>{ok ? "PASS ✓" : `FAIL ✗ ${error ?? ""}`}</span>
        </Row>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3: union
// ---------------------------------------------------------------------------

function UnionSection() {
  return (
    <section>
      <h3>3. Union type</h3>
      <p style={{ ...MUTED, fontSize: 12, margin: "4px 0 10px" }}>
        IDL unions encode a discriminant first, then the matching variant. The decoded
        value is <code>{"{ discriminant, value }"}</code>. A <code>defaultVariant</code>{" "}
        handles unrecognised discriminant values.
      </p>
      <pre>{`const SensorReading = createCodec("demo/SensorReading", {
  type: "union",
  discriminant: "int32",
  variants: {
    0: { type: "struct", fields: [{ name: "temperature", type: { type: "float32" } }] },
    1: { type: "struct", fields: [{ name: "pressure",    type: { type: "float64" } }] },
  },
  defaultVariant: { type: "struct", fields: [{ name: "label", type: { type: "string" } }] },
});`}</pre>
      {SENSOR_CASES.map((c) => {
        let buffer: ArrayBuffer | null = null;
        let decoded: unknown = null;
        let error: string | null = null;
        try {
          buffer = SensorReading.encode(c.value);
          decoded = SensorReading.decode(new Uint8Array(buffer));
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
        const ok = !error;
        return (
          <div
            key={c.label}
            style={{ marginTop: 12, paddingLeft: 12, borderLeft: "2px solid #30363d" }}
          >
            <div style={{ ...MUTED, fontSize: 11, marginBottom: 4 }}>{c.label}</div>
            <div style={GRID}>
              <Row label="encoded">
                <pre style={{ margin: 0 }}>
                  {buffer ? hexDump(new Uint8Array(buffer), false) : (error ?? "")}
                </pre>
              </Row>
              <Row label="decoded">
                <pre style={{ margin: 0 }}>
                  {decoded ? JSON.stringify(decoded, null, 2) : "—"}
                </pre>
              </Row>
              <Row label="ok?">
                <span style={ok ? PASS : FAIL}>{ok ? "PASS ✓" : `FAIL ✗ ${error}`}</span>
              </Row>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 4: XCDR2 appendable
// ---------------------------------------------------------------------------

function AppendableSection() {
  let encoded: ArrayBuffer | null = null;
  let decodedV1: unknown = null;
  let error: string | null = null;

  try {
    encoded = encodeWithPlan(planV2, v2Value, { kind: EncapsulationKind.CDR2_LE });
    decodedV1 = decodeWithPlan(planV1, new Uint8Array(encoded));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const v1 = decodedV1 as Record<string, unknown> | null;
  const ok =
    !error &&
    v1 != null &&
    v1["x"] === v2Value.x &&
    v1["y"] === v2Value.y &&
    !("z" in v1) &&
    !("label" in v1);

  return (
    <section>
      <h3>4. XCDR2 appendable struct — forward compatibility</h3>
      <p style={{ ...MUTED, fontSize: 12, margin: "4px 0 10px" }}>
        Appendable structs write a DHEADER (4-byte byte count) before the fields. An older
        subscriber can skip unknown trailing bytes added by a newer publisher — no decoder
        crash, no manual versioning logic.
      </p>
      <pre>{`// Newer publisher writes v2 schema (x, y, z, label) with XCDR2_LE
const encoded = encodeWithPlan(planV2, { x:1, y:2, z:3, label:"new_robot" }, {
  kind: EncapsulationKind.CDR2_LE,
});

// Older subscriber reads only v1 schema (x, y) — z and label are skipped
const decoded = decodeWithPlan(planV1, new Uint8Array(encoded));
// → { x: 1, y: 2 }  (z and label silently discarded)`}</pre>
      <div style={GRID}>
        <Row label="v2 source">
          <pre style={{ margin: 0 }}>{JSON.stringify(v2Value, null, 2)}</pre>
        </Row>
        <Row label="wire bytes">
          <pre style={{ margin: 0 }}>
            {encoded ? hexDump(new Uint8Array(encoded), false) : (error ?? "")}
          </pre>
        </Row>
        <Row label="v1 decoded">
          <pre style={{ margin: 0 }}>
            {decodedV1 ? JSON.stringify(decodedV1, null, 2) : "—"}
          </pre>
        </Row>
        <Row label="forward compat?">
          <span style={ok ? PASS : FAIL}>
            {ok ? "PASS ✓  (z + label silently skipped)" : `FAIL ✗ ${error ?? ""}`}
          </span>
        </Row>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function AdvancedFeaturesDemo() {
  return (
    <>
      <h2>Advanced features</h2>
      <p style={{ ...MUTED, fontSize: 12, margin: "0 0 20px" }}>
        New capabilities added beyond the Foxglove baseline: schema fingerprinting,
        wstring (UTF-16), IDL union types, and XCDR2 appendable structs for forward
        compatibility.
      </p>
      <FingerprintSection />
      <WstringSection />
      <UnionSection />
      <AppendableSection />
    </>
  );
}
