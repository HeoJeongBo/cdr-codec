import { Time } from "../builtin_interfaces/time";
import { Pose } from "../geometry_msgs/pose";
import { createCodec } from "../shared/codec";

// nav_msgs/MapMetaData
//   builtin_interfaces/Time map_load_time
//   float32 resolution
//   uint32 width
//   uint32 height
//   geometry_msgs/Pose origin
export interface MapMetaData {
  map_load_time: Time;
  resolution: number;
  width: number;
  height: number;
  origin: Pose;
}

export const MapMetaData = createCodec<MapMetaData>("nav_msgs/MapMetaData", {
  type: "struct",
  fields: [
    { name: "map_load_time", type: Time.plan },
    { name: "resolution", type: { type: "float32" } },
    { name: "width", type: { type: "uint32" } },
    { name: "height", type: { type: "uint32" } },
    { name: "origin", type: Pose.plan },
  ],
});
