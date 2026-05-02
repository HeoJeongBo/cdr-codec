import { createCodec } from "../shared/codec";

// unique_identifier_msgs/UUID
//   uint8[16] uuid
export interface UUID {
  uuid: number[];
}

export const UUID = createCodec<UUID>("unique_identifier_msgs/UUID", {
  type: "struct",
  fields: [
    {
      name: "uuid",
      type: { type: "fixed-array", length: 16, element: { type: "uint8" } },
    },
  ],
});
