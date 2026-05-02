import { createCodec } from "../shared/codec";

// diagnostic_msgs/KeyValue
//   string key
//   string value
export interface KeyValue {
  key: string;
  value: string;
}

export const KeyValue = createCodec<KeyValue>("diagnostic_msgs/KeyValue", {
  type: "struct",
  fields: [
    { name: "key", type: { type: "string" } },
    { name: "value", type: { type: "string" } },
  ],
});
