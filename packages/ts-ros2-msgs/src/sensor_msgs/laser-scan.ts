import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// sensor_msgs/LaserScan
//   std_msgs/Header header
//   float32 angle_min
//   float32 angle_max
//   float32 angle_increment
//   float32 time_increment
//   float32 scan_time
//   float32 range_min
//   float32 range_max
//   float32[] ranges
//   float32[] intensities
export interface LaserScan {
  header: Header;
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  time_increment: number;
  scan_time: number;
  range_min: number;
  range_max: number;
  ranges: number[];
  intensities: number[];
}

export const LaserScan = createCodec<LaserScan>("sensor_msgs/LaserScan", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "angle_min", type: { type: "float32" } },
    { name: "angle_max", type: { type: "float32" } },
    { name: "angle_increment", type: { type: "float32" } },
    { name: "time_increment", type: { type: "float32" } },
    { name: "scan_time", type: { type: "float32" } },
    { name: "range_min", type: { type: "float32" } },
    { name: "range_max", type: { type: "float32" } },
    { name: "ranges", type: { type: "sequence", element: { type: "float32" } } },
    { name: "intensities", type: { type: "sequence", element: { type: "float32" } } },
  ],
});
