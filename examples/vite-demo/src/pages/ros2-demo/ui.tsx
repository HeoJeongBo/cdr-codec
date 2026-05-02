import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";
import { useMemo } from "react";
import { hexDump } from "../../shared/lib";

const VALUE: Twist = {
  linear: { x: 0.5, y: 0.0, z: 0.0 },
  angular: { x: 0.0, y: 0.0, z: 0.25 },
};

const IMPORT_SNIPPET = `import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";

const buffer = Twist.encode(value);
const decoded: Twist = Twist.decode(new Uint8Array(buffer));`;

export function Ros2Demo() {
  const { buffer, decoded } = useMemo(() => {
    const encoded = Twist.encode(VALUE);
    return {
      buffer: encoded,
      decoded: Twist.decode(new Uint8Array(encoded)),
    };
  }, []);

  return (
    <>
      <h2>{Twist.name} via @heojeongbo/ts-ros2-msgs</h2>
      <section>
        <h3>Typed import (one-line ergonomics)</h3>
        <pre>{IMPORT_SNIPPET}</pre>
      </section>
      <section>
        <h3>Source value (TypeScript-typed)</h3>
        <pre>{JSON.stringify(VALUE, null, 2)}</pre>
      </section>
      <section>
        <h3>Encoded wire bytes ({buffer.byteLength} bytes, CDR_LE)</h3>
        <pre>{hexDump(new Uint8Array(buffer), false)}</pre>
      </section>
      <section>
        <h3>Decoded round-trip</h3>
        <pre>{JSON.stringify(decoded, null, 2)}</pre>
      </section>
      <section>
        <h3>Underlying DecodePlan (still JSON-serializable, usable with worker)</h3>
        <pre>{JSON.stringify(Twist.plan, null, 2)}</pre>
      </section>
    </>
  );
}
