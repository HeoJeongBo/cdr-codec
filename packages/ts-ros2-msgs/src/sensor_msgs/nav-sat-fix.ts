import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { NavSatStatus } from "./nav-sat-status";

// sensor_msgs/NavSatFix
//   uint8 COVARIANCE_TYPE_UNKNOWN = 0
//   uint8 COVARIANCE_TYPE_APPROXIMATED = 1
//   uint8 COVARIANCE_TYPE_DIAGONAL_KNOWN = 2
//   uint8 COVARIANCE_TYPE_KNOWN = 3
//   std_msgs/Header header
//   sensor_msgs/NavSatStatus status
//   float64 latitude
//   float64 longitude
//   float64 altitude
//   float64[9] position_covariance
//   uint8 position_covariance_type
export const NAV_SAT_FIX_COVARIANCE_TYPE = {
  UNKNOWN: 0,
  APPROXIMATED: 1,
  DIAGONAL_KNOWN: 2,
  KNOWN: 3,
} as const;

export interface NavSatFix {
  header: Header;
  status: NavSatStatus;
  latitude: number;
  longitude: number;
  altitude: number;
  position_covariance: number[];
  position_covariance_type: number;
}

export const NavSatFix = createCodec<NavSatFix>("sensor_msgs/NavSatFix", {
  type: "struct",
  fields: [
    { name: "header", type: Header.plan },
    { name: "status", type: NavSatStatus.plan },
    { name: "latitude", type: { type: "float64" } },
    { name: "longitude", type: { type: "float64" } },
    { name: "altitude", type: { type: "float64" } },
    {
      name: "position_covariance",
      type: { type: "fixed-array", length: 9, element: { type: "float64" } },
    },
    { name: "position_covariance_type", type: { type: "uint8" } },
  ],
});
