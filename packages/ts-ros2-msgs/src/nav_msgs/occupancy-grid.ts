import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { MapMetaData } from "./map-meta-data";

// nav_msgs/OccupancyGrid
//   std_msgs/Header header
//   nav_msgs/MapMetaData info
//   int8[] data
export interface OccupancyGrid {
  header: Header;
  info: MapMetaData;
  data: number[];
}

export const OccupancyGrid = createCodec<OccupancyGrid>("nav_msgs/OccupancyGrid", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "info", type: MapMetaData.plan },
    { name: "data", type: { type: "sequence", element: { type: "int8" } } },
  ],
});
