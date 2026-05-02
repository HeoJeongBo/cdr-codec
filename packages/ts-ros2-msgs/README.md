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
