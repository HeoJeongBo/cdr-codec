import { type DecodePlan, decodeWithPlan, encodeWithPlan } from "@heojeongbo/cdr-codec";
import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";
import { useMemo, useState } from "react";
import { hexDump } from "../../shared/lib";

const MUTED = { color: "#8b949e" } as const;
const INTRO_NOTE = {
  ...MUTED,
  fontSize: 12,
  margin: "0 0 16px",
} as const;
const STEP_LAYOUT = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 16,
  alignItems: "stretch",
} as const;
const STEP_NOTE = {
  ...MUTED,
  fontSize: 12,
  margin: "0 0 12px",
} as const;
const RESULT_LABEL = {
  ...MUTED,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  margin: "0 0 6px",
} as const;

const STEP1_CODE = `import type { DecodePlan } from "@heojeongbo/cdr-codec";

// A DecodePlan describes a CDR-encoded type structurally.
// It's plain JSON — composable, transferable, storable.
const plan: DecodePlan = {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
    { name: "label", type: { type: "string" } },
  ],
};`;

const STEP2_CODE = `import { encodeWithPlan, decodeWithPlan } from "@heojeongbo/cdr-codec";

const value = { x: 1.5, y: -2.25, label: "p" };

const buffer = encodeWithPlan(plan, value);
//    ^ Uint8Array — ready to send over WebSocket / DDS / IPC

const back = decodeWithPlan(plan, buffer);
//    ^ { x: 1.5, y: -2.25, label: "p" }`;

const STEP3_CODE = `import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";

// Common ROS 2 messages already ship with their plan AND TypeScript types.
// Same identifier is both a type and a runtime codec.
const buffer = Twist.encode({
  linear: { x: 0.5, y: 0, z: 0 },
  angular: { x: 0, y: 0, z: 0.25 },
});
const decoded: Twist = Twist.decode(new Uint8Array(buffer));`;

const STEP4_CODE = `// Decoding a 100 Hz LIDAR stream on the main thread will eventually
// jank your UI. Move it to a worker — same plan, same shape.

import { CdrWorkerClient } from "@heojeongbo/cdr-codec/worker-client";
import CdrWorker from "@heojeongbo/cdr-codec/worker?worker";

const client = new CdrWorkerClient(() => new CdrWorker());
const planId = await client.preparePlan(plan);

// per message:
const decoded = await client.decodeWithId(planId, buffer);
// ...
client.dispose();`;

const STEP1_PLAN: DecodePlan = {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
    { name: "label", type: { type: "string" } },
  ],
};

const STEP2_VALUE = { x: 1.5, y: -2.25, label: "p" };

const PLAYGROUND_DEFAULT_PLAN = JSON.stringify(STEP1_PLAN, null, 2);
const PLAYGROUND_DEFAULT_VALUE = JSON.stringify({ x: 1, y: 2, label: "hello" }, null, 2);

interface PlaygroundResult {
  hex: string;
  decoded: string;
}

function runPlayground(planText: string, valueText: string): PlaygroundResult {
  const plan = JSON.parse(planText) as DecodePlan;
  const value = JSON.parse(valueText);
  const wireBytes = new Uint8Array(encodeWithPlan(plan, value));
  const decoded = decodeWithPlan(plan, wireBytes);
  return {
    hex: hexDump(wireBytes),
    decoded: JSON.stringify(decoded, null, 2),
  };
}

function StepHeader({ index, title }: { index: number; title: string }) {
  return (
    <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          background: "#1f6feb",
          color: "white",
          borderRadius: 999,
          padding: "2px 10px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0,
          textTransform: "none",
        }}
      >
        Step {index}
      </span>
      <span>{title}</span>
    </h3>
  );
}

function PlaygroundPanel() {
  const [planText, setPlanText] = useState(PLAYGROUND_DEFAULT_PLAN);
  const [valueText, setValueText] = useState(PLAYGROUND_DEFAULT_VALUE);

  const result = useMemo<
    { ok: true; hex: string; decoded: string } | { ok: false; error: string }
  >(() => {
    try {
      const r = runPlayground(planText, valueText);
      return { ok: true, hex: r.hex, decoded: r.decoded };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, [planText, valueText]);

  const textareaStyle = {
    width: "100%",
    minHeight: 200,
    background: "#0a0d12",
    color: "#cad4df",
    border: "1px solid #1a1f27",
    borderRadius: 6,
    padding: 12,
    fontSize: 12,
    fontFamily: '"SF Mono", Menlo, Consolas, monospace',
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  };

  return (
    <section>
      <h3>Playground — edit the plan, see the wire change</h3>
      <p style={{ ...MUTED, fontSize: 12, margin: "4px 0 16px" }}>
        Paste any DecodePlan + a matching JSON value. Encode + decode runs as you type.
        JSON only — no arbitrary code execution.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <p style={RESULT_LABEL}>DecodePlan (JSON)</p>
          <textarea
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            spellCheck={false}
            style={textareaStyle}
          />
        </div>
        <div>
          <p style={RESULT_LABEL}>Value (JSON)</p>
          <textarea
            value={valueText}
            onChange={(e) => setValueText(e.target.value)}
            spellCheck={false}
            style={textareaStyle}
          />
        </div>
      </div>

      {result.ok ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 16,
          }}
        >
          <div>
            <p style={RESULT_LABEL}>Wire bytes (hex)</p>
            <pre style={{ margin: 0 }}>{result.hex}</pre>
          </div>
          <div>
            <p style={RESULT_LABEL}>Decoded</p>
            <pre style={{ margin: 0 }}>{result.decoded}</pre>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "#2c1216",
            border: "1px solid #5a1d1d",
            borderRadius: 6,
            padding: 12,
            color: "#f85149",
            fontSize: 12,
            fontFamily: '"SF Mono", Menlo, Consolas, monospace',
            whiteSpace: "pre-wrap",
          }}
        >
          {result.error}
        </div>
      )}
    </section>
  );
}

export function GettingStartedDemo() {
  const step2Result = useMemo(() => {
    const wireBytes = new Uint8Array(encodeWithPlan(STEP1_PLAN, STEP2_VALUE));
    const back = decodeWithPlan(STEP1_PLAN, wireBytes);
    return { wireBytes, back };
  }, []);

  const step3Result = useMemo(() => {
    const buffer = Twist.encode({
      linear: { x: 0.5, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0.25 },
    });
    return { buffer };
  }, []);

  return (
    <>
      <h2>Getting started — from a developer's keyboard</h2>
      <p style={INTRO_NOTE}>
        Four steps. The code on the left is exactly what you'd paste into your app; the
        panel on the right is the actual output of that same code, running here in your
        browser. At the bottom is a small playground for trying your own plans.
      </p>

      <section>
        <StepHeader index={1} title="Define a plan" />
        <p style={STEP_NOTE}>
          A <code>DecodePlan</code> is JSON-serializable structural typing for the wire.
          You'll reuse this same shape for both encode and decode.
        </p>
        <div style={STEP_LAYOUT}>
          <pre style={{ margin: 0 }}>{STEP1_CODE}</pre>
          <div>
            <p style={RESULT_LABEL}>Plan as data</p>
            <pre style={{ margin: 0 }}>{JSON.stringify(STEP1_PLAN, null, 2)}</pre>
          </div>
        </div>
      </section>

      <section>
        <StepHeader index={2} title="Encode → wire bytes → decode" />
        <p style={STEP_NOTE}>
          Pass the plan + a value to <code>encodeWithPlan</code>. You get back a{" "}
          <code>Uint8Array</code> ready to ship. <code>decodeWithPlan</code> with the same
          plan reverses it.
        </p>
        <div style={STEP_LAYOUT}>
          <pre style={{ margin: 0 }}>{STEP2_CODE}</pre>
          <div>
            <p style={RESULT_LABEL}>
              Wire bytes ({step2Result.wireBytes.byteLength} bytes)
            </p>
            <pre style={{ margin: 0 }}>{hexDump(step2Result.wireBytes)}</pre>
            <p style={{ ...RESULT_LABEL, marginTop: 12 }}>Decoded back</p>
            <pre style={{ margin: 0 }}>{JSON.stringify(step2Result.back, null, 2)}</pre>
          </div>
        </div>
      </section>

      <section>
        <StepHeader index={3} title="Skip the plan — use a built-in ROS 2 message" />
        <p style={STEP_NOTE}>
          For standard ROS 2 messages you don't write a plan at all.{" "}
          <code>@heojeongbo/ts-ros2-msgs</code> ships them. The same identifier is the
          TypeScript <em>type</em> and the runtime <em>codec</em>.
        </p>
        <div style={STEP_LAYOUT}>
          <pre style={{ margin: 0 }}>{STEP3_CODE}</pre>
          <div>
            <p style={RESULT_LABEL}>
              Wire bytes ({step3Result.buffer.byteLength} bytes, CDR_LE)
            </p>
            <pre style={{ margin: 0 }}>
              {hexDump(new Uint8Array(step3Result.buffer), false)}
            </pre>
          </div>
        </div>
      </section>

      <section>
        <StepHeader
          index={4}
          title="Don't block the UI — move heavy decodes to a worker"
        />
        <p style={STEP_NOTE}>
          When you're ingesting LIDAR / point clouds / video frames at high frequency,
          decode in a worker. Same plan, transferable buffers, no main-thread jank. (Live
          benchmark in the <strong>Worker</strong> tab.)
        </p>
        <div style={STEP_LAYOUT}>
          <pre style={{ margin: 0 }}>{STEP4_CODE}</pre>
          <div>
            <p style={RESULT_LABEL}>What changes vs. step 2</p>
            <ul style={{ ...MUTED, fontSize: 12, margin: 0, paddingLeft: 20 }}>
              <li>Plan is registered once and referenced by id.</li>
              <li>Buffers are transferred (zero-copy), not cloned.</li>
              <li>
                Decoded result returns via <code>postMessage</code>.
              </li>
              <li>Main-thread call site stays a one-liner.</li>
            </ul>
          </div>
        </div>
      </section>

      <PlaygroundPanel />
    </>
  );
}
