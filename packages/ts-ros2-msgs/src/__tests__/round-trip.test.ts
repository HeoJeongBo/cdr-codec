import { describe, expect, it } from "vitest";
import { GOAL_STATUS, GoalInfo, GoalStatus, GoalStatusArray } from "../action_msgs";
import { Duration, Time } from "../builtin_interfaces";
import {
  DIAGNOSTIC_STATUS_LEVEL,
  DiagnosticArray,
  DiagnosticStatus,
  KeyValue,
} from "../diagnostic_msgs";
import {
  Accel,
  AccelStamped,
  Point,
  Pose,
  PoseStamped,
  PoseWithCovariance,
  Quaternion,
  Transform,
  TransformStamped,
  Twist,
  TwistStamped,
  TwistWithCovariance,
  Vector3,
} from "../geometry_msgs";
import {
  LIFECYCLE_STATE,
  LIFECYCLE_TRANSITION,
  State,
  Transition,
} from "../lifecycle_msgs";
import { MapMetaData, OccupancyGrid, Odometry, Path } from "../nav_msgs";
import { Clock } from "../rosgraph_msgs";
import {
  CameraInfo,
  CompressedImage,
  Image,
  Imu,
  JointState,
  LaserScan,
  NAV_SAT_FIX_COVARIANCE_TYPE,
  NAV_SAT_STATUS,
  NavSatFix,
  NavSatStatus,
  POINT_FIELD_DATATYPE,
  PointCloud2,
  PointField,
  RANGE_RADIATION_TYPE,
  Range,
  RegionOfInterest,
} from "../sensor_msgs";
import {
  BoolMsg,
  ColorRGBA,
  Float32,
  Float64,
  Header,
  Int8,
  Int16,
  Int32,
  StringMsg,
  UInt8,
  UInt16,
  UInt32,
} from "../std_msgs";
import { TFMessage } from "../tf2_msgs";
import { UUID } from "../unique_identifier_msgs";

function roundTrip<T>(
  codec: { encode(v: T): ArrayBuffer; decode(b: Uint8Array): T },
  value: T,
): T {
  return codec.decode(new Uint8Array(codec.encode(value)));
}

describe("builtin_interfaces", () => {
  it("Time / Duration round-trip", () => {
    expect(roundTrip(Time, { sec: 1700000000, nanosec: 123456789 })).toEqual({
      sec: 1700000000,
      nanosec: 123456789,
    });
    expect(roundTrip(Duration, { sec: -10, nanosec: 0 })).toEqual({
      sec: -10,
      nanosec: 0,
    });
    expect(Time.name).toBe("builtin_interfaces/Time");
    expect(Duration.name).toBe("builtin_interfaces/Duration");
  });
});

describe("std_msgs", () => {
  it("Header round-trip", () => {
    const h = { stamp: { sec: 5, nanosec: 6 }, frame_id: "map" };
    expect(roundTrip(Header, h)).toEqual(h);
  });

  it("ColorRGBA round-trip", () => {
    expect(roundTrip(ColorRGBA, { r: 0.1, g: 0.2, b: 0.3, a: 1 })).toEqual({
      r: expect.closeTo(0.1, 5),
      g: expect.closeTo(0.2, 5),
      b: expect.closeTo(0.3, 5),
      a: 1,
    });
  });

  it("StringMsg, BoolMsg, numeric variants round-trip", () => {
    expect(roundTrip(StringMsg, { data: "hello" })).toEqual({ data: "hello" });
    expect(roundTrip(BoolMsg, { data: true })).toEqual({ data: true });
    expect(roundTrip(Int8, { data: -5 })).toEqual({ data: -5 });
    expect(roundTrip(UInt8, { data: 200 })).toEqual({ data: 200 });
    expect(roundTrip(Int16, { data: -3000 })).toEqual({ data: -3000 });
    expect(roundTrip(UInt16, { data: 60000 })).toEqual({ data: 60000 });
    expect(roundTrip(Int32, { data: -1_000_000 })).toEqual({ data: -1_000_000 });
    expect(roundTrip(UInt32, { data: 3_000_000_000 })).toEqual({ data: 3_000_000_000 });
    expect(roundTrip(Float32, { data: 0.5 })).toEqual({ data: expect.closeTo(0.5, 5) });
    expect(roundTrip(Float64, { data: Math.PI })).toEqual({
      data: expect.closeTo(Math.PI, 10),
    });
    expect(Int32.name).toBe("std_msgs/Int32");
  });
});

describe("geometry_msgs", () => {
  const point = { x: 1, y: 2, z: 3 };
  const vector3 = { x: 0.5, y: -0.5, z: 0 };
  const quat = { x: 0, y: 0, z: 0, w: 1 };
  const header = { stamp: { sec: 1, nanosec: 2 }, frame_id: "base_link" };

  it("primitives round-trip", () => {
    expect(roundTrip(Point, point)).toEqual(point);
    expect(roundTrip(Vector3, vector3)).toEqual(vector3);
    expect(roundTrip(Quaternion, quat)).toEqual(quat);
  });

  it("composites round-trip", () => {
    const pose = { position: point, orientation: quat };
    expect(roundTrip(Pose, pose)).toEqual(pose);
    const twist = { linear: vector3, angular: vector3 };
    expect(roundTrip(Twist, twist)).toEqual(twist);
    const accel = { linear: vector3, angular: vector3 };
    expect(roundTrip(Accel, accel)).toEqual(accel);
    const transform = { translation: vector3, rotation: quat };
    expect(roundTrip(Transform, transform)).toEqual(transform);

    expect(roundTrip(PoseStamped, { header, pose })).toEqual({ header, pose });
    expect(roundTrip(TwistStamped, { header, twist })).toEqual({ header, twist });
    expect(roundTrip(AccelStamped, { header, accel })).toEqual({ header, accel });
    expect(
      roundTrip(TransformStamped, { header, child_frame_id: "imu", transform }),
    ).toEqual({ header, child_frame_id: "imu", transform });
  });

  it("PoseWithCovariance / TwistWithCovariance round-trip", () => {
    const cov = Array.from({ length: 36 }, (_, i) => i * 0.1);
    const pose = { position: point, orientation: quat };
    const twist = { linear: vector3, angular: vector3 };
    expect(roundTrip(PoseWithCovariance, { pose, covariance: cov }).pose).toEqual(pose);
    expect(roundTrip(TwistWithCovariance, { twist, covariance: cov }).twist).toEqual(
      twist,
    );
  });
});

describe("sensor_msgs", () => {
  const header = { stamp: { sec: 0, nanosec: 0 }, frame_id: "imu_link" };
  const vec = { x: 0, y: 0, z: 0 };
  const quat = { x: 0, y: 0, z: 0, w: 1 };
  const cov9 = Array.from({ length: 9 }, () => 0);

  it("Imu round-trip", () => {
    const imu = {
      header,
      orientation: quat,
      orientation_covariance: cov9,
      angular_velocity: vec,
      angular_velocity_covariance: cov9,
      linear_acceleration: vec,
      linear_acceleration_covariance: cov9,
    };
    expect(roundTrip(Imu, imu)).toEqual(imu);
  });

  it("LaserScan round-trip", () => {
    const scan = {
      header,
      angle_min: -1,
      angle_max: 1,
      angle_increment: 0.01,
      time_increment: 0,
      scan_time: 0.1,
      range_min: 0.05,
      range_max: 30,
      ranges: [1, 2, 3, 4],
      intensities: [],
    };
    const out = roundTrip(LaserScan, scan);
    expect(out.ranges).toEqual([1, 2, 3, 4]);
    expect(out.intensities).toEqual([]);
  });

  it("PointField + PointCloud2 round-trip", () => {
    expect(POINT_FIELD_DATATYPE.FLOAT32).toBe(7);
    const fields: PointField[] = [
      { name: "x", offset: 0, datatype: POINT_FIELD_DATATYPE.FLOAT32, count: 1 },
      { name: "y", offset: 4, datatype: POINT_FIELD_DATATYPE.FLOAT32, count: 1 },
    ];
    const pc = {
      header,
      height: 1,
      width: 2,
      fields,
      is_bigendian: false,
      point_step: 8,
      row_step: 16,
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      is_dense: true,
    };
    expect(roundTrip(PointCloud2, pc)).toEqual(pc);
  });

  it("Image / CompressedImage round-trip", () => {
    const img = {
      header,
      height: 2,
      width: 2,
      encoding: "rgb8",
      is_bigendian: 0,
      step: 6,
      data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    };
    expect(roundTrip(Image, img)).toEqual(img);
    expect(
      roundTrip(CompressedImage, { header, format: "jpeg", data: [255, 216, 255] }),
    ).toEqual({ header, format: "jpeg", data: [255, 216, 255] });
  });

  it("CameraInfo + RegionOfInterest round-trip", () => {
    const roi: RegionOfInterest = {
      x_offset: 0,
      y_offset: 0,
      height: 240,
      width: 320,
      do_rectify: false,
    };
    const info = {
      header,
      height: 480,
      width: 640,
      distortion_model: "plumb_bob",
      d: [0.1, 0.2, 0.3, 0.4, 0.5],
      k: cov9,
      r: cov9,
      p: Array.from({ length: 12 }, () => 0),
      binning_x: 1,
      binning_y: 1,
      roi,
    };
    expect(roundTrip(CameraInfo, info).distortion_model).toBe("plumb_bob");
    expect(roundTrip(RegionOfInterest, roi)).toEqual(roi);
  });

  it("JointState round-trip", () => {
    const js = {
      header,
      name: ["joint1", "joint2"],
      position: [0.1, 0.2],
      velocity: [],
      effort: [],
    };
    expect(roundTrip(JointState, js)).toEqual(js);
  });

  it("NavSatStatus + NavSatFix round-trip with constants", () => {
    expect(NAV_SAT_STATUS.STATUS_FIX).toBe(0);
    expect(NAV_SAT_FIX_COVARIANCE_TYPE.KNOWN).toBe(3);
    const status = {
      status: NAV_SAT_STATUS.STATUS_FIX,
      service: NAV_SAT_STATUS.SERVICE_GPS,
    };
    expect(roundTrip(NavSatStatus, status)).toEqual(status);
    const fix = {
      header,
      status,
      latitude: 37.5,
      longitude: 127,
      altitude: 50,
      position_covariance: cov9,
      position_covariance_type: NAV_SAT_FIX_COVARIANCE_TYPE.KNOWN,
    };
    expect(roundTrip(NavSatFix, fix).latitude).toBeCloseTo(37.5);
  });

  it("Range round-trip", () => {
    expect(RANGE_RADIATION_TYPE.INFRARED).toBe(1);
    const r = {
      header,
      radiation_type: RANGE_RADIATION_TYPE.ULTRASOUND,
      field_of_view: 0.1,
      min_range: 0.01,
      max_range: 5,
      range: 1.5,
      variance: 0.001,
    };
    expect(roundTrip(Range, r).range).toBeCloseTo(1.5);
  });
});

describe("nav_msgs", () => {
  const header = { stamp: { sec: 0, nanosec: 0 }, frame_id: "map" };
  const pose = {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  };

  it("MapMetaData / OccupancyGrid round-trip", () => {
    const info = {
      map_load_time: { sec: 0, nanosec: 0 },
      resolution: 0.05,
      width: 4,
      height: 2,
      origin: pose,
    };
    expect(roundTrip(MapMetaData, info).resolution).toBeCloseTo(0.05);

    const grid = { header, info, data: [0, 100, -1, 50, 75, -1, 0, 100] };
    expect(roundTrip(OccupancyGrid, grid).data).toEqual(grid.data);
  });

  it("Path round-trip", () => {
    const path = {
      header,
      poses: [
        { header, pose },
        { header, pose },
      ],
    };
    expect(roundTrip(Path, path).poses.length).toBe(2);
  });

  it("Odometry round-trip", () => {
    const cov = Array.from({ length: 36 }, () => 0);
    const odom = {
      header,
      child_frame_id: "base_link",
      pose: { pose, covariance: cov },
      twist: {
        twist: { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } },
        covariance: cov,
      },
    };
    expect(roundTrip(Odometry, odom).child_frame_id).toBe("base_link");
  });
});

describe("tf2_msgs / rosgraph_msgs", () => {
  it("TFMessage round-trip", () => {
    const header = { stamp: { sec: 1, nanosec: 0 }, frame_id: "world" };
    const transform = {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    };
    const msg = {
      transforms: [{ header, child_frame_id: "robot", transform }],
    };
    expect(roundTrip(TFMessage, msg).transforms[0]?.child_frame_id).toBe("robot");
  });

  it("Clock round-trip", () => {
    const c = { clock: { sec: 1234, nanosec: 5678 } };
    expect(roundTrip(Clock, c)).toEqual(c);
  });
});

describe("diagnostic_msgs", () => {
  const header = { stamp: { sec: 0, nanosec: 0 }, frame_id: "" };

  it("KeyValue / DiagnosticStatus / DiagnosticArray round-trip", () => {
    const kv = { key: "battery", value: "85%" };
    expect(roundTrip(KeyValue, kv)).toEqual(kv);

    const status = {
      level: DIAGNOSTIC_STATUS_LEVEL.WARN,
      name: "imu",
      message: "calibrating",
      hardware_id: "abc",
      values: [kv],
    };
    expect(roundTrip(DiagnosticStatus, status).level).toBe(DIAGNOSTIC_STATUS_LEVEL.WARN);

    const arr = { header, status: [status] };
    expect(roundTrip(DiagnosticArray, arr).status[0]?.name).toBe("imu");
  });
});

describe("unique_identifier_msgs / action_msgs", () => {
  it("UUID round-trip", () => {
    const u = { uuid: Array.from({ length: 16 }, (_, i) => i) };
    expect(roundTrip(UUID, u)).toEqual(u);
  });

  it("GoalInfo / GoalStatus / GoalStatusArray round-trip", () => {
    const goalInfo = {
      goal_id: { uuid: Array.from({ length: 16 }, () => 0) },
      stamp: { sec: 0, nanosec: 0 },
    };
    expect(roundTrip(GoalInfo, goalInfo)).toEqual(goalInfo);

    expect(GOAL_STATUS.SUCCEEDED).toBe(4);
    const gs = { goal_info: goalInfo, status: GOAL_STATUS.EXECUTING };
    expect(roundTrip(GoalStatus, gs).status).toBe(GOAL_STATUS.EXECUTING);

    const arr = { status_list: [gs, gs] };
    expect(roundTrip(GoalStatusArray, arr).status_list.length).toBe(2);
  });
});

describe("lifecycle_msgs", () => {
  it("State / Transition round-trip with constants", () => {
    expect(LIFECYCLE_STATE.PRIMARY_STATE_ACTIVE).toBe(3);
    expect(LIFECYCLE_TRANSITION.TRANSITION_ACTIVATE).toBe(3);
    expect(roundTrip(State, { id: 3, label: "active" })).toEqual({
      id: 3,
      label: "active",
    });
    expect(roundTrip(Transition, { id: 1, label: "configure" })).toEqual({
      id: 1,
      label: "configure",
    });
  });
});

describe("createCodec helpers", () => {
  it("exposes name + plan + encode + decode", () => {
    expect(Twist.name).toBe("geometry_msgs/Twist");
    expect(Twist.plan.type).toBe("struct");
    const buf = Twist.encode({
      linear: { x: 1, y: 2, z: 3 },
      angular: { x: 0, y: 0, z: 0 },
    });
    expect(buf).toBeInstanceOf(ArrayBuffer);
  });
});
