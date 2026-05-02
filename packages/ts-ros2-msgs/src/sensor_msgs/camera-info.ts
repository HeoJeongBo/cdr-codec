import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { RegionOfInterest } from "./region-of-interest";

// sensor_msgs/CameraInfo
//   std_msgs/Header header
//   uint32 height
//   uint32 width
//   string distortion_model
//   float64[] d
//   float64[9]  k
//   float64[9]  r
//   float64[12] p
//   uint32 binning_x
//   uint32 binning_y
//   sensor_msgs/RegionOfInterest roi
export interface CameraInfo {
  header: Header;
  height: number;
  width: number;
  distortion_model: string;
  d: number[];
  k: number[];
  r: number[];
  p: number[];
  binning_x: number;
  binning_y: number;
  roi: RegionOfInterest;
}

export const CameraInfo = createCodec<CameraInfo>("sensor_msgs/CameraInfo", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "height", type: { type: "uint32" } },
    { name: "width", type: { type: "uint32" } },
    { name: "distortion_model", type: { type: "string" } },
    { name: "d", type: { type: "sequence", element: { type: "float64" } } },
    {
      name: "k",
      type: { type: "fixed-array", length: 9, element: { type: "float64" } },
    },
    {
      name: "r",
      type: { type: "fixed-array", length: 9, element: { type: "float64" } },
    },
    {
      name: "p",
      type: { type: "fixed-array", length: 12, element: { type: "float64" } },
    },
    { name: "binning_x", type: { type: "uint32" } },
    { name: "binning_y", type: { type: "uint32" } },
    { name: "roi", type: RegionOfInterest.plan },
  ],
});
