# cdr-codec

CDR (Common Data Representation) tooling for TypeScript — the wire format used
by ROS 2, DDS, and OMG IDL. This repository is a pnpm monorepo containing two
published packages.

## Packages

| Package | Description |
| --- | --- |
| [`@heojeongbo/cdr-codec`](./packages/cdr-codec) | CDR encoder/decoder, plan-based runner, and Web Worker layer. Schema-agnostic. |
| [`@heojeongbo/ts-ros2-msgs`](./packages/ts-ros2-msgs) | Hand-written `DecodePlan`s and TypeScript interfaces for the most common ROS 2 standard messages, layered on top of `@heojeongbo/cdr-codec`. |
| [`@heojeongbo/ts-ros2bag-replay`](./packages/ts-ros2bag-replay) | MCAP rosbag reader + timeline replay. Replays a `.mcap` file as typed ROS 2 messages on real wall-clock time, with `play` / `pause` / `seek` / `setSpeed`. |

See each package's README for usage and API.

## Development

```bash
pnpm install
pnpm build           # builds both packages
pnpm typecheck
pnpm test
```

Releases are driven per-package by [release-it](https://github.com/release-it/release-it)
with conventional-commits-based version bumps:

```bash
pnpm release:cdr-codec        # or :patch / :minor / :major / :dry
pnpm release:ts-ros2-msgs     # or :patch / :minor / :major / :dry
pnpm release:ts-ros2bag-replay  # or :patch / :minor / :major / :dry
```

Each package tags as `<package>-v<version>` (e.g. `cdr-codec-v0.1.0`,
`ts-ros2-msgs-v0.1.1`, `ts-ros2bag-replay-v0.1.0`) so versions can move independently.

## Acknowledgements

The CDR wire-format behavior in `@heojeongbo/cdr-codec` is modeled after
Foxglove's MIT-licensed [`@foxglove/cdr`](https://github.com/foxglove/cdr).
The message coverage in `@heojeongbo/ts-ros2-msgs` mirrors the choices made by
Foxglove's [`rosmsg-msgs-common`](https://github.com/foxglove/ros-typescript/tree/main/packages/rosmsg-msgs-common).
The MCAP reader in `@heojeongbo/ts-ros2bag-replay` is built on top of Foxglove's
[`@mcap/core`](https://github.com/foxglove/mcap).

## License

MIT — see [LICENSE](./LICENSE).
