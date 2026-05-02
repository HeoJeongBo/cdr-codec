import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    builtin_interfaces: "src/builtin_interfaces/index.ts",
    std_msgs: "src/std_msgs/index.ts",
    geometry_msgs: "src/geometry_msgs/index.ts",
    sensor_msgs: "src/sensor_msgs/index.ts",
    nav_msgs: "src/nav_msgs/index.ts",
    tf2_msgs: "src/tf2_msgs/index.ts",
    rosgraph_msgs: "src/rosgraph_msgs/index.ts",
    diagnostic_msgs: "src/diagnostic_msgs/index.ts",
    action_msgs: "src/action_msgs/index.ts",
    lifecycle_msgs: "src/lifecycle_msgs/index.ts",
    unique_identifier_msgs: "src/unique_identifier_msgs/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@heojeongbo/cdr-codec"],
});
