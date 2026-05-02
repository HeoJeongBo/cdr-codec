import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";

// sensor_msgs/Range
//   uint8 ULTRASOUND = 0
//   uint8 INFRARED   = 1
//   std_msgs/Header header
//   uint8 radiation_type
//   float32 field_of_view
//   float32 min_range
//   float32 max_range
//   float32 range
//   float32 variance
export const RANGE_RADIATION_TYPE = {
  ULTRASOUND: 0,
  INFRARED: 1,
} as const;

export interface Range {
  header: Header;
  radiation_type: number;
  field_of_view: number;
  min_range: number;
  max_range: number;
  range: number;
  variance: number;
}

export const Range = createCodec<Range>("sensor_msgs/Range", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "radiation_type", type: { type: "uint8" } },
    { name: "field_of_view", type: { type: "float32" } },
    { name: "min_range", type: { type: "float32" } },
    { name: "max_range", type: { type: "float32" } },
    { name: "range", type: { type: "float32" } },
    { name: "variance", type: { type: "float32" } },
  ],
});
