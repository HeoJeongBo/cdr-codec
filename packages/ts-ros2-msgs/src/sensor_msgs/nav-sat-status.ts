import { createCodec } from "../shared/codec";

// sensor_msgs/NavSatStatus
//   int8 STATUS_NO_FIX  = -1
//   int8 STATUS_FIX     =  0
//   int8 STATUS_SBAS_FIX =  1
//   int8 STATUS_GBAS_FIX =  2
//   int8  status
//   uint16 SERVICE_GPS   = 1
//   uint16 SERVICE_GLONASS = 2
//   uint16 SERVICE_COMPASS = 4
//   uint16 SERVICE_GALILEO = 8
//   uint16 service
export const NAV_SAT_STATUS = {
  STATUS_NO_FIX: -1,
  STATUS_FIX: 0,
  STATUS_SBAS_FIX: 1,
  STATUS_GBAS_FIX: 2,
  SERVICE_GPS: 1,
  SERVICE_GLONASS: 2,
  SERVICE_COMPASS: 4,
  SERVICE_GALILEO: 8,
} as const;

export interface NavSatStatus {
  status: number;
  service: number;
}

export const NavSatStatus = createCodec<NavSatStatus>("sensor_msgs/NavSatStatus", {
  type: "struct",
  fields: [
    { name: "status", type: { type: "int8" } },
    { name: "service", type: { type: "uint16" } },
  ],
});
