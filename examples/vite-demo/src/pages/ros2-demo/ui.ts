import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";
import { escapeHtml, hexDump } from "../../shared/lib";

export function renderRos2Demo(host: HTMLElement): void {
  const value: Twist = {
    linear: { x: 0.5, y: 0.0, z: 0.0 },
    angular: { x: 0.0, y: 0.0, z: 0.25 },
  };

  const buffer = Twist.encode(value);
  const decoded = Twist.decode(new Uint8Array(buffer));

  host.innerHTML = `
    <h2>${escapeHtml(Twist.name)} via @heojeongbo/ts-ros2-msgs</h2>
    <section>
      <h3>Typed import (one-line ergonomics)</h3>
      <pre>${escapeHtml(
        `import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";

const buffer = Twist.encode(value);
const decoded: Twist = Twist.decode(new Uint8Array(buffer));`,
      )}</pre>
    </section>
    <section>
      <h3>Source value (TypeScript-typed)</h3>
      <pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>
    </section>
    <section>
      <h3>Encoded wire bytes (${buffer.byteLength} bytes, CDR_LE)</h3>
      <pre>${escapeHtml(hexDump(new Uint8Array(buffer), false))}</pre>
    </section>
    <section>
      <h3>Decoded round-trip</h3>
      <pre>${escapeHtml(JSON.stringify(decoded, null, 2))}</pre>
    </section>
    <section>
      <h3>Underlying DecodePlan (still JSON-serializable, usable with worker)</h3>
      <pre>${escapeHtml(JSON.stringify(Twist.plan, null, 2))}</pre>
    </section>
  `;
}
