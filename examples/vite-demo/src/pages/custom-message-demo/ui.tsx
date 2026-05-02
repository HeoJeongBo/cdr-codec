import { createCodec } from "@heojeongbo/ts-ros2-msgs";
import { Header } from "@heojeongbo/ts-ros2-msgs/std_msgs";
import { hexDump } from "../../shared/lib";

interface RobotStatus {
  header: Header;
  battery_pct: number;
  mode: string;
  motor_velocities: number[];
}

const RobotStatus = createCodec<RobotStatus>("my_pkg/RobotStatus", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "battery_pct", type: { type: "float32" } },
    { name: "mode", type: { type: "string" } },
    {
      name: "motor_velocities",
      type: { type: "sequence", element: { type: "float64" } },
    },
  ],
});

interface MotorState {
  name: string;
  target_position: number;
  max_velocity: number;
}
interface MotorCmd {
  motors: MotorState[];
  emergency_stop: boolean;
}

const MotorCmd = createCodec<MotorCmd>("my_pkg/MotorCmd", {
  type: "struct",
  fields: [
    {
      name: "motors",
      type: {
        type: "sequence",
        element: {
          type: "struct",
          fields: [
            { name: "name", type: { type: "string" } },
            { name: "target_position", type: { type: "float64" } },
            { name: "max_velocity", type: { type: "float32" } },
          ],
        },
      },
    },
    { name: "emergency_stop", type: { type: "boolean" } },
  ],
});

interface CustomCase {
  readonly title: string;
  readonly snippet: string;
  readonly codec: {
    name: string;
    encode(v: unknown): ArrayBuffer;
    decode(b: Uint8Array): unknown;
  };
  readonly value: unknown;
}

const ROBOT_STATUS_VALUE: RobotStatus = {
  header: { stamp: { sec: 1700000000, nanosec: 0 }, frame_id: "base_link" },
  battery_pct: 0.85,
  mode: "auto",
  motor_velocities: [0.5, -0.5, 0],
};

const MOTOR_CMD_VALUE: MotorCmd = {
  motors: [
    { name: "left_wheel", target_position: 1.5, max_velocity: 2.0 },
    { name: "right_wheel", target_position: -1.5, max_velocity: 2.0 },
  ],
  emergency_stop: false,
};

const CASES: CustomCase[] = [
  {
    title: "A — Reuses std_msgs/Header",
    snippet: `import { createCodec } from "@heojeongbo/ts-ros2-msgs";
import { Header } from "@heojeongbo/ts-ros2-msgs/std_msgs";

interface RobotStatus {
  header: Header;
  battery_pct: number;
  mode: string;
  motor_velocities: number[];
}

const RobotStatus = createCodec<RobotStatus>("my_pkg/RobotStatus", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "battery_pct", type: { type: "float32" } },
    { name: "mode", type: { type: "string" } },
    {
      name: "motor_velocities",
      type: { type: "sequence", element: { type: "float64" } },
    },
  ],
});`,
    codec: RobotStatus as never,
    value: ROBOT_STATUS_VALUE,
  },
  {
    title: "B — Entirely new (no built-in refs, sequence of struct)",
    snippet: `interface MotorState {
  name: string;
  target_position: number;
  max_velocity: number;
}
interface MotorCmd {
  motors: MotorState[];
  emergency_stop: boolean;
}

const MotorCmd = createCodec<MotorCmd>("my_pkg/MotorCmd", {
  type: "struct",
  fields: [
    {
      name: "motors",
      type: {
        type: "sequence",
        element: {
          type: "struct",
          fields: [
            { name: "name", type: { type: "string" } },
            { name: "target_position", type: { type: "float64" } },
            { name: "max_velocity", type: { type: "float32" } },
          ],
        },
      },
    },
    { name: "emergency_stop", type: { type: "boolean" } },
  ],
});`,
    codec: MotorCmd as never,
    value: MOTOR_CMD_VALUE,
  },
];

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
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

function approxEqual(a: unknown, b: unknown, tol = 1e-5): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= tol;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!approxEqual(a[i], b[i], tol)) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object" && a && b) {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (
        !approxEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
          tol,
        )
      ) {
        return false;
      }
    }
    return true;
  }
  return deepEqual(a, b);
}

const MUTED = { color: "#8b949e" } as const;
const PASS_STYLE = { color: "#3fb950", fontWeight: 600 } as const;
const FAIL_STYLE = { color: "#f85149", fontWeight: 600 } as const;
const GRID = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: "6px 12px",
  fontSize: 12,
  marginTop: 12,
} as const;

function CaseCard({ caseDef }: { caseDef: CustomCase }) {
  let buffer: ArrayBuffer | null = null;
  let decoded: unknown;
  let error: string | null = null;
  try {
    buffer = caseDef.codec.encode(caseDef.value);
    decoded = caseDef.codec.decode(new Uint8Array(buffer));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const ok = !error && approxEqual(decoded, caseDef.value);

  return (
    <section>
      <h3>
        {caseDef.title}{" "}
        <span style={{ color: "#8b949e", fontWeight: 400 }}>({caseDef.codec.name})</span>
      </h3>
      <p style={{ ...MUTED, fontSize: 12, margin: "4px 0 8px" }}>
        User code (defined in your app, not in the library):
      </p>
      <pre>{caseDef.snippet}</pre>

      <div style={GRID}>
        <div style={MUTED}>source value</div>
        <pre style={{ margin: 0 }}>{JSON.stringify(caseDef.value, null, 2)}</pre>

        <div style={MUTED}>wire bytes</div>
        <pre style={{ margin: 0 }}>
          {buffer ? hexDump(new Uint8Array(buffer), false) : (error ?? "")}
        </pre>

        <div style={MUTED}>decoded</div>
        <pre style={{ margin: 0 }}>{error ? "—" : JSON.stringify(decoded, null, 2)}</pre>

        <div style={MUTED}>round-trip</div>
        <div>
          <span style={ok ? PASS_STYLE : FAIL_STYLE}>{ok ? "PASS ✓" : "FAIL ✗"}</span>
          {error ? (
            <span style={{ color: "#f85149", fontSize: 12, marginLeft: 8 }}>{error}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function CustomMessageDemo() {
  return (
    <>
      <h2>Custom messages — defined in user code</h2>
      <p style={{ ...MUTED, fontSize: 12, margin: "0 0 16px" }}>
        Define your own ROS 2 messages with <code>createCodec</code> directly in app code.
        The library has no registry — these objects are values your code owns. Custom
        messages can compose built-ins (case A reuses <code>std_msgs/Header.plan</code>)
        or stand alone (case B has no built-in references).
      </p>
      {CASES.map((c) => (
        <CaseCard key={c.title} caseDef={c} />
      ))}
    </>
  );
}
