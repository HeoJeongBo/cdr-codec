import { createCodec } from "@heojeongbo/ts-ros2-msgs";
import { Header } from "@heojeongbo/ts-ros2-msgs/std_msgs";
import { escapeHtml, hexDump } from "../../shared/lib";

// === User-defined messages (this code lives in user app code, not the library) ===

// A) Reuses std_msgs/Header — composition with built-ins via Header.plan.
interface RobotStatus {
  header: Header;
  battery_pct: number; // float32
  mode: string;
  motor_velocities: number[]; // float64 sequence
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

// B) Entirely custom, no built-in references — exercises sequence-of-struct.
interface MotorState {
  name: string;
  target_position: number; // float64
  max_velocity: number; // float32
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

// === Demo wiring ===

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

function renderCase(c: CustomCase): string {
  let buffer: ArrayBuffer | null = null;
  let decoded: unknown;
  let error: string | null = null;
  try {
    buffer = c.codec.encode(c.value);
    decoded = c.codec.decode(new Uint8Array(buffer));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const ok = !error && approxEqual(decoded, c.value);
  const badge = ok
    ? `<span style="color:#3fb950;font-weight:600">PASS ✓</span>`
    : `<span style="color:#f85149;font-weight:600">FAIL ✗</span>`;

  return `
    <section>
      <h3>${escapeHtml(c.title)} <span style="color:#8b949e;font-weight:400">(${escapeHtml(c.codec.name)})</span></h3>
      <p style="color:#8b949e;font-size:12px;margin:4px 0 8px">User code (defined in your app, not in the library):</p>
      <pre>${escapeHtml(c.snippet)}</pre>

      <div style="display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:12px;margin-top:12px">
        <div style="color:#8b949e">source value</div>
        <pre style="margin:0">${escapeHtml(JSON.stringify(c.value, null, 2))}</pre>

        <div style="color:#8b949e">wire bytes</div>
        <pre style="margin:0">${escapeHtml(
          buffer ? hexDump(new Uint8Array(buffer), false) : (error ?? ""),
        )}</pre>

        <div style="color:#8b949e">decoded</div>
        <pre style="margin:0">${escapeHtml(
          error ? "—" : JSON.stringify(decoded, null, 2),
        )}</pre>

        <div style="color:#8b949e">round-trip</div>
        <div>${badge}${error ? ` <span style="color:#f85149;font-size:12px">${escapeHtml(error)}</span>` : ""}</div>
      </div>
    </section>
  `;
}

export function renderCustomMessageDemo(host: HTMLElement): void {
  host.innerHTML = `
    <h2>Custom messages — defined in user code</h2>
    <p style="color:#8b949e;font-size:12px;margin:0 0 16px">
      Define your own ROS 2 messages with <code>createCodec</code> directly in app code.
      The library has no registry — these objects are values your code owns.
      Custom messages can compose built-ins (case A reuses <code>std_msgs/Header.plan</code>)
      or stand alone (case B has no built-in references).
    </p>
    ${CASES.map(renderCase).join("")}
  `;
}
