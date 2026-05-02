import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { PointField } from "./point-field";

// sensor_msgs/PointCloud2
//   std_msgs/Header header
//   uint32 height
//   uint32 width
//   sensor_msgs/PointField[] fields
//   bool is_bigendian
//   uint32 point_step
//   uint32 row_step
//   uint8[] data
//   bool is_dense
export interface PointCloud2 {
  header: Header;
  height: number;
  width: number;
  fields: PointField[];
  is_bigendian: boolean;
  point_step: number;
  row_step: number;
  data: number[];
  is_dense: boolean;
}

export const PointCloud2 = createCodec<PointCloud2>("sensor_msgs/PointCloud2", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "height", type: { type: "uint32" } },
    { name: "width", type: { type: "uint32" } },
    { name: "fields", type: { type: "sequence", element: PointField.plan } },
    { name: "is_bigendian", type: { type: "boolean" } },
    { name: "point_step", type: { type: "uint32" } },
    { name: "row_step", type: { type: "uint32" } },
    { name: "data", type: { type: "sequence", element: { type: "uint8" } } },
    { name: "is_dense", type: { type: "boolean" } },
  ],
});
