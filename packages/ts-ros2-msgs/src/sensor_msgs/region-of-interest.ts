import { createCodec } from "../shared/codec";

// sensor_msgs/RegionOfInterest
//   uint32 x_offset
//   uint32 y_offset
//   uint32 height
//   uint32 width
//   bool   do_rectify
export interface RegionOfInterest {
  x_offset: number;
  y_offset: number;
  height: number;
  width: number;
  do_rectify: boolean;
}

export const RegionOfInterest = createCodec<RegionOfInterest>(
  "sensor_msgs/RegionOfInterest",
  {
    type: "struct",
    fields: [
      { name: "x_offset", type: { type: "uint32" } },
      { name: "y_offset", type: { type: "uint32" } },
      { name: "height", type: { type: "uint32" } },
      { name: "width", type: { type: "uint32" } },
      { name: "do_rectify", type: { type: "boolean" } },
    ],
  },
);
