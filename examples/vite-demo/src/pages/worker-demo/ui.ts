import { type DecodePlan, decodeWithPlan, encodeWithPlan } from "@heojeongbo/cdr-codec";
import CdrWorker from "@heojeongbo/cdr-codec/worker?worker";
import { CdrWorkerClient } from "@heojeongbo/cdr-codec/worker-client";
import { escapeHtml } from "../../shared/lib";

const PLAN: DecodePlan = {
  type: "struct",
  fields: [
    { name: "stamp", type: { type: "uint64" } },
    { name: "samples", type: { type: "sequence", element: { type: "float64" } } },
  ],
};

const N = 5_000;
const ITER = 50;

export async function renderWorkerDemo(host: HTMLElement): Promise<void> {
  host.innerHTML = `
    <h2>Worker (transferable buffers)</h2>
    <section><h3>Spinning up worker…</h3></section>
  `;

  const client = new CdrWorkerClient(() => new CdrWorker());
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

  client.dispose();

  host.innerHTML = `
    <h2>Worker (transferable buffers)</h2>
    <section>
      <h3>Plan</h3>
      <pre>${escapeHtml(JSON.stringify(PLAN, null, 2))}</pre>
    </section>
    <section>
      <h3>Benchmark — ${ITER} iterations × ${N} float64 samples</h3>
      <table>
        <thead><tr><th>where</th><th>total ms</th><th>per-iter ms</th></tr></thead>
        <tbody>
          <tr><td>main thread (sync)</td><td>${mainMs.toFixed(2)}</td><td>${(
            mainMs / ITER
          ).toFixed(3)}</td></tr>
          <tr><td>worker (transferable)</td><td>${workerMs.toFixed(
            2,
          )}</td><td>${(workerMs / ITER).toFixed(3)}</td></tr>
        </tbody>
      </table>
      <p style="color:#8b949e;font-size:12px;margin-top:12px">
        Worker timings include postMessage round-trip; main-thread timings do not block the
        UI in this demo because the work is short, but at high frequency the worker keeps
        the main thread free.
      </p>
    </section>
  `;
}
