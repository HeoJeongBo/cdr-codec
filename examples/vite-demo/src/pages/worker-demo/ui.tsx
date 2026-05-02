import { type DecodePlan, decodeWithPlan, encodeWithPlan } from "@heojeongbo/cdr-codec";
import CdrWorker from "@heojeongbo/cdr-codec/worker?worker";
import { CdrWorkerClient } from "@heojeongbo/cdr-codec/worker-client";
import { useEffect, useState } from "react";

const PLAN: DecodePlan = {
  type: "struct",
  fields: [
    { name: "stamp", type: { type: "uint64" } },
    { name: "samples", type: { type: "sequence", element: { type: "float64" } } },
  ],
};

const N = 5_000;
const ITER = 50;

interface Results {
  mainMs: number;
  workerMs: number;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; results: Results }
  | { kind: "error"; message: string };

export function WorkerDemo() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let disposed = false;
    let client: CdrWorkerClient | null = null;

    (async () => {
      try {
        client = new CdrWorkerClient(() => new CdrWorker());
        const planId = await client.preparePlan(PLAN);

        const samples = Array.from({ length: N }, (_, i) => Math.sin(i / 50));
        const reference = { stamp: 1_700_000_000_000_000_000n, samples };
        const buffer = encodeWithPlan(PLAN, reference);

        const mainStart = performance.now();
        for (let i = 0; i < ITER; i++) {
          decodeWithPlan(PLAN, new Uint8Array(buffer));
        }
        const mainMs = performance.now() - mainStart;

        const workerStart = performance.now();
        for (let i = 0; i < ITER; i++) {
          const copy = buffer.slice(0);
          await client.decodeWithId(planId, copy);
        }
        const workerMs = performance.now() - workerStart;

        if (!disposed) {
          setState({ kind: "ready", results: { mainMs, workerMs } });
        }
      } catch (err) {
        if (!disposed) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    return () => {
      disposed = true;
      client?.dispose();
    };
  }, []);

  return (
    <>
      <h2>Worker (transferable buffers)</h2>
      <section>
        <h3>Plan</h3>
        <pre>{JSON.stringify(PLAN, null, 2)}</pre>
      </section>
      <section>
        <h3>
          Benchmark — {ITER} iterations × {N} float64 samples
        </h3>
        {state.kind === "loading" && <p>Spinning up worker…</p>}
        {state.kind === "error" && (
          <p style={{ color: "#f85149" }}>Worker error: {state.message}</p>
        )}
        {state.kind === "ready" && (
          <>
            <table>
              <thead>
                <tr>
                  <th>where</th>
                  <th>total ms</th>
                  <th>per-iter ms</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>main thread (sync)</td>
                  <td>{state.results.mainMs.toFixed(2)}</td>
                  <td>{(state.results.mainMs / ITER).toFixed(3)}</td>
                </tr>
                <tr>
                  <td>worker (transferable)</td>
                  <td>{state.results.workerMs.toFixed(2)}</td>
                  <td>{(state.results.workerMs / ITER).toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
            <p style={{ color: "#8b949e", fontSize: 12, marginTop: 12 }}>
              Worker timings include postMessage round-trip; main-thread timings do not
              block the UI in this demo because the work is short, but at high frequency
              the worker keeps the main thread free.
            </p>
          </>
        )}
      </section>
    </>
  );
}
