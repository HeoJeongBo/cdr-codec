# @heojeongbo/ts-ros2bag-replay

MCAP rosbag reader + timeline player. Drop a `.mcap` file in, get **typed ROS 2
messages** out — at real wall-clock pace, with `play` / `pause` / `seek` /
`setSpeed`. Built on top of [`@mcap/core`](https://github.com/foxglove/mcap)
and [`@heojeongbo/cdr-codec`](../cdr-codec).

## Install

```bash
pnpm add @heojeongbo/ts-ros2bag-replay @heojeongbo/cdr-codec @heojeongbo/ts-ros2-msgs
```

`@heojeongbo/ts-ros2-msgs` is an *optional* peer — only required if you use
`builtInCodecs()` to decode standard ROS 2 messages. If you only decode your
own custom messages (via `createCodec`), you can skip it.

## Quick start

```ts
import { BagPlayer, builtInCodecs } from "@heojeongbo/ts-ros2bag-replay";
import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";

// In a browser: wire up file input / drag-drop and pass the File.
const player = await BagPlayer.open({
  source: file,                    // File | Blob | ArrayBuffer | Uint8Array
  codecs: await builtInCodecs(),   // 51 standard ROS 2 messages, indexed by name
});

console.log(player.topics);        // { name, schemaName, messageCount, hasCodec }[]
console.log(player.startTime);     // bigint, ns since epoch
console.log(player.endTime);

// Typed subscription — `msg` is inferred as `Twist`
const unsubCmd = player.subscribeWith(Twist, "/cmd_vel", (msg, ev) => {
  console.log(ev.logTime, msg.linear.x, msg.angular.z);
});

// Untyped subscription — handler gets `unknown`, you cast
const unsubScan = player.subscribe("/scan", (msg, ev) => {
  console.log(ev.logTime, msg);
});

player.play();                     // begins replay at 1× speed
player.setSpeed(2);                // 2× faster
player.seek(player.startTime + 5_000_000_000n);  // jump 5 seconds in
player.pause();

// When done
unsubCmd();
unsubScan();
player.dispose();
```

## API

### `BagPlayer.open(options)`

```ts
interface BagPlayerOptions {
  source: Blob | File | ArrayBuffer | Uint8Array;
  codecs?: ReadonlyMap<string, RosMessageCodec<unknown>>;   // schema name → codec
  speed?: number;                                            // default 1
  unknownSchema?: "skip" | "warn" | (info => void);          // default "warn"
  decompressHandlers?: DecompressHandlers;                   // extras for lz4 / bz2
  onError?: (err: Error) => void;                            // playback failure
}
```

Returns a `Promise<BagPlayer>`. Reads the MCAP file's index (not the full
contents) so opening is fast even for large bags.

### `player.topics`, `startTime`, `endTime`, `currentTime`, `speed`, `playing`

Read-only metadata. `startTime`/`endTime`/`currentTime` are `bigint`
nanoseconds-since-epoch (matching MCAP's clock).

### Playback controls

| method | effect |
| --- | --- |
| `play()` | Start (or resume) replay from `currentTime`. No-op if already playing or at end. |
| `pause()` | Stop replay; `currentTime` is preserved. |
| `seek(time)` | Jump to `time` (clamped to `[startTime, endTime]`). If currently playing, replay continues from there. |
| `setSpeed(rate)` | Change playback multiplier (must be positive). Active replay is restarted at the new pace. |
| `dispose()` | Permanent shutdown. Cancels replay, drops subscribers, closes the reader. |

### Subscriptions

```ts
// Pass a codec — the message type is inferred and decoded automatically.
player.subscribeWith<T>(codec: RosMessageCodec<T>, topic: string, handler);

// No codec — looks up `options.codecs` by the message's schema name.
// If not found, the handler is skipped (per the `unknownSchema` policy).
player.subscribe<T = unknown>(topic: string, handler);
```

Both return an unsubscribe function. Multiple subscribers per topic are fine;
they each receive the decoded message.

### `builtInCodecs()`

Returns a `Promise<ReadonlyMap<string, RosMessageCodec<unknown>>>` covering
every codec exported by `@heojeongbo/ts-ros2-msgs`, keyed by canonical name
(e.g. `"std_msgs/Header"`). Pass this as `options.codecs` to decode all
standard ROS 2 messages.

### `normalizeSchemaName(name)`

Helper that converts MCAP's canonical ROS 2 schema name
(`"std_msgs/msg/Header"`) into the lookup key used by codecs
(`"std_msgs/Header"`). Idempotent; service / action names pass through.

## How replay timing works

When `play()` is called, the player snapshots `(wallStartMs, bagStartNs, speed)`
and uses these to map each message's `logTime` to a wall-clock dispatch time.
For each message it computes `delayMs = (logTime - bagStartNs) / 1e6 / speed -
elapsedWall` and sleeps that long before dispatching. `pause` cancels the
in-flight sleep; `setSpeed` re-baselines so future messages use the new pace.

The MCAP reader is **indexed**, so `seek` is constant-time regardless of bag
size, and only the chunk(s) needed for the current playback window are
decompressed.

## Limitations (v1)

- **MCAP only.** ROS 2 `.db3` (rosbag2 SQLite storage) is not supported. Most
  modern ROS 2 setups can output MCAP via the [rosbag2 MCAP storage plugin](https://github.com/ros-tooling/rosbag2_storage_mcap).
- **Built-in messages only.** Schemas that aren't in your `codecs` map are
  skipped (with a one-time console warning by default). Future versions will
  parse the schema text inside MCAP at runtime so any message decodes.
- **`zstd` is built-in. `lz4` / `bz2` need user handlers.** zstd-compressed
  bags decompress out of the box via [`fzstd`](https://github.com/101arrowz/fzstd)
  (pure-JS, no WASM). For lz4 / bz2 chunks, pass your own handlers:

  ```ts
  import { loadDecompressHandlers } from "@mcap/support";

  const player = await BagPlayer.open({
    source: file,
    codecs: await builtInCodecs(),
    decompressHandlers: await loadDecompressHandlers(),  // lz4 + zstd + bz2
  });
  ```

  `@mcap/support` ships WASM modules, so consumer bundlers may need
  [`vite-plugin-wasm`](https://github.com/Menci/vite-plugin-wasm) or
  equivalent. User handlers override the built-in for the same key.
- **Read-only.** No bag writer.

## Acknowledgements

- [`@mcap/core`](https://github.com/foxglove/mcap) — Foxglove's TypeScript MCAP SDK does the heavy lifting.
- The wire-format and codec layer is [`@heojeongbo/cdr-codec`](../cdr-codec).

## License

MIT — see the [LICENSE](https://github.com/HeoJeongBo/cdr-codec/blob/main/LICENSE)
in the repository root.
