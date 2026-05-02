import { createCodec } from "../shared/codec";
import { KeyValue } from "./key-value";

// diagnostic_msgs/DiagnosticStatus
//   byte OK    = 0
//   byte WARN  = 1
//   byte ERROR = 2
//   byte STALE = 3
//   byte level
//   string name
//   string message
//   string hardware_id
//   diagnostic_msgs/KeyValue[] values
export const DIAGNOSTIC_STATUS_LEVEL = {
  OK: 0,
  WARN: 1,
  ERROR: 2,
  STALE: 3,
} as const;

export interface DiagnosticStatus {
  level: number;
  name: string;
  message: string;
  hardware_id: string;
  values: KeyValue[];
}

export const DiagnosticStatus = createCodec<DiagnosticStatus>(
  "diagnostic_msgs/DiagnosticStatus",
  {
    type: "struct",
    fields: [
      { name: "level", type: { type: "uint8" } },
      { name: "name", type: { type: "string" } },
      { name: "message", type: { type: "string" } },
      { name: "hardware_id", type: { type: "string" } },
      { name: "values", type: { type: "sequence", element: KeyValue.plan } },
    ],
  },
);
