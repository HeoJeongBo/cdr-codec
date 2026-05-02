import type { RosMessageCodec } from "@heojeongbo/ts-ros2-msgs";

/**
 * Lookup table from normalized ROS 2 schema name (e.g. `"std_msgs/Header"`) to
 * a typed codec. Pass one to `BagPlayer.open` so it can decode message bytes.
 */
export type CodecRegistry = ReadonlyMap<string, RosMessageCodec<unknown>>;

function isCodec(value: unknown): value is RosMessageCodec<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "plan" in value &&
    "encode" in value &&
    "decode" in value
  );
}

/**
 * Build a registry of every built-in ROS 2 codec exported by
 * `@heojeongbo/ts-ros2-msgs`. Keys are the canonical `family/Name` schema names
 * (e.g. `"std_msgs/Header"`, matching the codec's own `.name` field).
 *
 * The dependency on `ts-ros2-msgs` is dynamic so callers who only need to
 * decode their own custom codecs don't have to install the standard message
 * package.
 *
 * @example
 *   const codecs = await builtInCodecs();
 *   const player = await BagPlayer.open({ source: file, codecs });
 */
export async function builtInCodecs(): Promise<CodecRegistry> {
  const mod = (await import("@heojeongbo/ts-ros2-msgs")) as Record<string, unknown>;
  const map = new Map<string, RosMessageCodec<unknown>>();
  for (const family of Object.values(mod)) {
    if (typeof family !== "object" || family === null) continue;
    for (const exported of Object.values(family as Record<string, unknown>)) {
      if (isCodec(exported)) {
        map.set(exported.name, exported);
      }
    }
  }
  return map;
}
