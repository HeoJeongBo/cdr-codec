import { describe, expect, it } from "vitest";
import { normalizeSchemaName } from "../schema";

describe("normalizeSchemaName", () => {
  it("strips the /msg/ segment from canonical ROS 2 message names", () => {
    expect(normalizeSchemaName("std_msgs/msg/Header")).toBe("std_msgs/Header");
    expect(normalizeSchemaName("geometry_msgs/msg/Twist")).toBe("geometry_msgs/Twist");
    expect(normalizeSchemaName("sensor_msgs/msg/PointCloud2")).toBe(
      "sensor_msgs/PointCloud2",
    );
  });

  it("is idempotent — already-normalized names pass through", () => {
    expect(normalizeSchemaName("std_msgs/Header")).toBe("std_msgs/Header");
  });

  it("preserves srv and action schema names", () => {
    expect(normalizeSchemaName("example_interfaces/srv/AddTwoInts")).toBe(
      "example_interfaces/srv/AddTwoInts",
    );
    expect(normalizeSchemaName("action_msgs/action/Fibonacci")).toBe(
      "action_msgs/action/Fibonacci",
    );
  });

  it("does not touch unrelated multi-segment names", () => {
    expect(normalizeSchemaName("some/odd/name/with/many/parts")).toBe(
      "some/odd/name/with/many/parts",
    );
    expect(normalizeSchemaName("singleSegment")).toBe("singleSegment");
  });
});
