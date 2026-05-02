import { createCodec } from "../shared/codec";

// sensor_msgs/PointField (constants exposed for ergonomics)
//   uint8 INT8    = 1
//   uint8 UINT8   = 2
//   uint8 INT16   = 3
//   uint8 UINT16  = 4
//   uint8 INT32   = 5
//   uint8 UINT32  = 6
//   uint8 FLOAT32 = 7
//   uint8 FLOAT64 = 8
//   string name
//   uint32 offset
//   uint8  datatype
//   uint32 count
export const POINT_FIELD_DATATYPE = {
  INT8: 1,
  UINT8: 2,
  INT16: 3,
  UINT16: 4,
  INT32: 5,
  UINT32: 6,
  FLOAT32: 7,
  FLOAT64: 8,
} as const;

export interface PointField {
  name: string;
  offset: number;
  datatype: number;
  count: number;
}

export const PointField = createCodec<PointField>("sensor_msgs/PointField", {
  type: "struct",
  fields: [
    { name: "name", type: { type: "string" } },
    { name: "offset", type: { type: "uint32" } },
    { name: "datatype", type: { type: "uint8" } },
    { name: "count", type: { type: "uint32" } },
  ],
});
