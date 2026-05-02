# @heojeongbo/cdr-codec

A TypeScript encoder/decoder for **CDR (Common Data Representation)** — the wire
format used by ROS 2, DDS, and OMG IDL. The codec layer is transport- and
schema-agnostic: ROS 2 is the first consumer, but the same primitives serve any
CDR producer/consumer.

For high-frequency message decoding, the package also ships a Web Worker layer
so decoding does not block the main thread.

## Install

```bash
pnpm add @heojeongbo/cdr-codec
```

## Quick start (sync codec)

```ts
import { CdrWriter, CdrReader, EncapsulationKind } from "@heojeongbo/cdr-codec";

const writer = new CdrWriter({ kind: EncapsulationKind.CDR_LE });
writer.float64(1.5);
writer.string("hello");

const reader = new CdrReader(writer.data);
reader.float64(); // 1.5
reader.string(); // "hello"
```

## Plan-based decoding (JSON-serializable schema)

```ts
import { decodeWithPlan, encodeWithPlan, type DecodePlan } from "@heojeongbo/cdr-codec";

const plan: DecodePlan = {
  type: "struct",
  fields: [
    { name: "x", type: { type: "float64" } },
    { name: "y", type: { type: "float64" } },
    { name: "label", type: { type: "string" } },
  ],
};

const buffer = encodeWithPlan(plan, { x: 1.0, y: 2.0, label: "p" });
const decoded = decodeWithPlan(plan, buffer);
```

## Worker layer

```ts
import { CdrWorkerClient } from "@heojeongbo/cdr-codec/worker-client";
// Vite / modern bundlers — the worker entry is bundled separately:
import CdrWorker from "@heojeongbo/cdr-codec/worker?worker";

const client = new CdrWorkerClient(() => new CdrWorker());
const planId = await client.preparePlan(plan);
const result = await client.decodeWithId(planId, buffer); // transferable
client.dispose();
```

## Supported encapsulation kinds

CDR1 (`CDR_BE`, `CDR_LE`, `PL_CDR_BE`, `PL_CDR_LE`) and CDR2
(`CDR2_BE`, `CDR2_LE`, `PL_CDR2_BE`, `PL_CDR2_LE`,
`DELIMITED_CDR2_BE`, `DELIMITED_CDR2_LE`).

## Acknowledgements

The wire-format behavior — encapsulation header, alignment rules, and
fast-path typed-array reads — is modeled after Foxglove's MIT-licensed
[`@foxglove/cdr`](https://github.com/foxglove/cdr) package. This library
restructures it as a generic codec + JSON-plan + Worker for non-ROS use cases.

## License

MIT — see [LICENSE](./LICENSE).
