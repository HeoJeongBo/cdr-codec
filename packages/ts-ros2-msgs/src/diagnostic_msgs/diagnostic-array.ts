import { createCodec } from "../shared/codec";
import { Header } from "../std_msgs/header";
import { DiagnosticStatus } from "./diagnostic-status";

// diagnostic_msgs/DiagnosticArray
//   std_msgs/Header header
//   diagnostic_msgs/DiagnosticStatus[] status
export interface DiagnosticArray {
  header: Header;
  status: DiagnosticStatus[];
}

export const DiagnosticArray = createCodec<DiagnosticArray>(
  "diagnostic_msgs/DiagnosticArray",
  {
    type: "struct",
    fields: [
      { name: "header", type: Header.plan },
      { name: "status", type: { type: "sequence", element: DiagnosticStatus.plan } },
    ],
  },
);
