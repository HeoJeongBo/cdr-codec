# @heojeongbo/ts-ros2-msgs

Hand-written **DecodePlan** definitions and matching **TypeScript interfaces** for the
most common ROS 2 standard messages, layered on top of
[`@heojeongbo/cdr-codec`](../cdr-codec). Each message exports a single value that
is *both* a TypeScript type and a typed codec.

## Install

```bash
pnpm add @heojeongbo/ts-ros2-msgs @heojeongbo/cdr-codec
```

## Usage

```ts
import { Twist } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";

const value: Twist = {
  linear: { x: 0.5, y: 0, z: 0 },
  angular: { x: 0, y: 0, z: 0.25 },
};

const buffer = Twist.encode(value);              // ArrayBuffer (CDR_LE wire format)
const decoded: Twist = Twist.decode(new Uint8Array(buffer));
console.log(Twist.name); // "geometry_msgs/Twist"
console.log(Twist.plan); // raw DecodePlan, also usable with the worker layer
```

Each message exports both a type and a value with the same name. `Twist` as a type
gives autocomplete; `Twist` as a value gives `.encode`, `.decode`, `.plan`, `.name`.

## Module structure

```
@heojeongbo/ts-ros2-msgs                 # all families re-exported
@heojeongbo/ts-ros2-msgs/builtin_interfaces
@heojeongbo/ts-ros2-msgs/std_msgs
@heojeongbo/ts-ros2-msgs/geometry_msgs
@heojeongbo/ts-ros2-msgs/sensor_msgs
@heojeongbo/ts-ros2-msgs/nav_msgs
@heojeongbo/ts-ros2-msgs/tf2_msgs
@heojeongbo/ts-ros2-msgs/rosgraph_msgs
@heojeongbo/ts-ros2-msgs/diagnostic_msgs
@heojeongbo/ts-ros2-msgs/action_msgs
@heojeongbo/ts-ros2-msgs/lifecycle_msgs
@heojeongbo/ts-ros2-msgs/unique_identifier_msgs
```

Subpath imports tree-shake well — only the family you import lands in your bundle.

## Defining custom messages

ROS 2 projects almost always define their own `.msg` types. You don't need to
fork or modify this package to use them — `createCodec` produces a typed codec
inline in your own code. Custom messages can compose built-in types or stand
entirely on their own.

### Reusing a built-in (e.g. `std_msgs/Header`)

Every built-in exports a `.plan` you can drop into a parent `struct` field.

```ts
import { createCodec } from "@heojeongbo/ts-ros2-msgs";
import { Header } from "@heojeongbo/ts-ros2-msgs/std_msgs";

interface RobotStatus {
  header: Header;
  battery_pct: number;
  motor_velocities: number[];
}

export const RobotStatus = createCodec<RobotStatus>("my_pkg/RobotStatus", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "battery_pct", type: { type: "float32" } },
    {
      name: "motor_velocities",
      type: { type: "sequence", element: { type: "float64" } },
    },
  ],
});

const buffer = RobotStatus.encode({
  header: { stamp: { sec: 0, nanosec: 0 }, frame_id: "base_link" },
  battery_pct: 0.85,
  motor_velocities: [0.5, -0.5, 0],
});
const decoded: RobotStatus = RobotStatus.decode(new Uint8Array(buffer));
```

### A standalone custom message (no built-in references)

```ts
import { createCodec } from "@heojeongbo/ts-ros2-msgs";

interface MotorState {
  name: string;
  target_position: number;
  max_velocity: number;
}
interface MotorCmd {
  motors: MotorState[];
  emergency_stop: boolean;
}

export const MotorCmd = createCodec<MotorCmd>("my_pkg/MotorCmd", {
  type: "struct",
  fields: [
    {
      name: "motors",
      type: {
        type: "sequence",
        element: {
          type: "struct",
          fields: [
            { name: "name", type: { type: "string" } },
            { name: "target_position", type: { type: "float64" } },
            { name: "max_velocity", type: { type: "float32" } },
          ],
        },
      },
    },
    { name: "emergency_stop", type: { type: "boolean" } },
  ],
});
```

The pattern uses TypeScript's type/value namespace split: declaring an
`interface MotorCmd` and a `const MotorCmd = createCodec(...)` is legal and
gives the same identifier both an autocompleting type AND a runtime codec.

`createCodec` does **not** register messages anywhere — the returned object is
just data your code owns. Define as many custom messages as you need.

## Coverage

This package targets the messages most commonly seen on the wire. It currently
ships ~50 messages across 11 families, mirroring the choices made by Foxglove's
[`rosmsg-msgs-common`](https://github.com/foxglove/ros-typescript/tree/main/packages/rosmsg-msgs-common)
package. Field definitions follow the latest stable ROS 2 distributions
(humble / iron / jazzy / rolling — these messages have been stable for years).

Out of scope (open an issue if you need them):

- Less-common families (`stereo_msgs`, `shape_msgs`, `trajectory_msgs`, ROS 2 control)
- Service / Action interfaces beyond `action_msgs`
- Auto-generation from `.msg` files

## License

MIT — see root LICENSE.
