import type { CdrPrimitiveType } from "@heojeongbo/cdr-codec";
import { createCodec, type RosMessageCodec } from "../shared/codec";

// Numeric std_msgs single-value wrappers (Int8/UInt8/.../Float32/Float64).
// Each is `<numeric> data`. We share one factory because every shape is identical.

export interface NumericMsg {
  data: number;
}

function numericMsg(
  rosName: string,
  prim: CdrPrimitiveType,
): RosMessageCodec<NumericMsg> {
  return createCodec<NumericMsg>(rosName, {
    type: "struct",
    fields: [{ name: "data", type: { type: prim } }],
  });
}

export const Int8 = numericMsg("std_msgs/Int8", "int8");
export const UInt8 = numericMsg("std_msgs/UInt8", "uint8");
export const Int16 = numericMsg("std_msgs/Int16", "int16");
export const UInt16 = numericMsg("std_msgs/UInt16", "uint16");
export const Int32 = numericMsg("std_msgs/Int32", "int32");
export const UInt32 = numericMsg("std_msgs/UInt32", "uint32");
export const Float32 = numericMsg("std_msgs/Float32", "float32");
export const Float64 = numericMsg("std_msgs/Float64", "float64");
