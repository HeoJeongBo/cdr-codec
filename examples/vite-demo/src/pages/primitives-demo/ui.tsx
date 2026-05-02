import { CdrReader, CdrWriter, EncapsulationKind } from "@heojeongbo/cdr-codec";
import { useMemo } from "react";
import { hexDump } from "../../shared/lib";

const SOURCE = {
  int32: -42,
  uint64: "123456789012345n",
  float64: Math.PI,
  string: "hello, cdr",
  int32Array: [1, 2, 3, 4],
};

function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(
    value,
    (_, v) => (typeof v === "bigint" ? `${v.toString()}n` : v),
    2,
  );
}

export function PrimitivesDemo() {
  const { bytes, decoded } = useMemo(() => {
    const writer = new CdrWriter({ kind: EncapsulationKind.CDR_LE });
    writer.int32(-42).uint64(123_456_789_012_345n).float64(Math.PI).string("hello, cdr");
    writer.int32Array([1, 2, 3, 4]);

    const wireBytes = writer.data;
    const reader = new CdrReader(wireBytes);
    const value = {
      i32: reader.int32(),
      u64: reader.uint64(),
      f64: reader.float64(),
      s: reader.string(),
      arr: Array.from(reader.int32Array()),
    };
    return { bytes: wireBytes, decoded: value };
  }, []);

  return (
    <>
      <h2>Primitives + hex dump</h2>
      <section>
        <h3>Encoded value</h3>
        <pre>{JSON.stringify(SOURCE, null, 2)}</pre>
      </section>
      <section>
        <h3>Wire format (encapsulation header + payload, {bytes.byteLength} bytes)</h3>
        <pre>{hexDump(bytes)}</pre>
      </section>
      <section>
        <h3>Decoded value</h3>
        <pre>{stringifyWithBigInt(decoded)}</pre>
      </section>
    </>
  );
}
