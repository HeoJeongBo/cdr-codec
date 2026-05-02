// Generates `public/sample.mcap` and `public/sample.db3` — small synthetic
// rosbag fixtures the demo can load with one click. Run via:
//   pnpm --filter vite-demo gen:samples

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { McapWriter } from "@mcap/core";
import initSqlJs from "sql.js";

import { Twist, Vector3 } from "@heojeongbo/ts-ros2-msgs/geometry_msgs";
import { Header } from "@heojeongbo/ts-ros2-msgs/std_msgs";
import { Time } from "@heojeongbo/ts-ros2-msgs/builtin_interfaces";
import { LaserScan } from "@heojeongbo/ts-ros2-msgs/sensor_msgs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public");

// ---------- Synthetic 5-second message stream -------------------------------
const startNs = 1_700_000_000_000_000_000n; // arbitrary anchor
const durationNs = 5_000_000_000n;
const endNs = startNs + durationNs;

function tAt(i, hz) {
  return startNs + (BigInt(i) * 1_000_000_000n) / BigInt(hz);
}

function makeTwist(i) {
  // Smooth circular motion-ish.
  const t = i / 10;
  return /** @type {Twist} */ ({
    linear: /** @type {Vector3} */ ({ x: Math.cos(t), y: 0, z: 0 }),
    angular: /** @type {Vector3} */ ({ x: 0, y: 0, z: Math.sin(t) }),
  });
}

function makeHeader(i) {
  const stamp = tAt(i, 1);
  return /** @type {Header} */ ({
    stamp: /** @type {Time} */ ({
      sec: Number(stamp / 1_000_000_000n),
      nanosec: Number(stamp % 1_000_000_000n),
    }),
    frame_id: `base_link/${i}`,
  });
}

function makeScan(i) {
  const stamp = tAt(i, 5);
  return /** @type {LaserScan} */ ({
    header: {
      stamp: {
        sec: Number(stamp / 1_000_000_000n),
        nanosec: Number(stamp % 1_000_000_000n),
      },
      frame_id: "lidar",
    },
    angle_min: -1.5,
    angle_max: 1.5,
    angle_increment: 3 / 32,
    time_increment: 0.001,
    scan_time: 0.05,
    range_min: 0.1,
    range_max: 30,
    ranges: Array.from({ length: 32 }, (_, k) => 1 + Math.sin(i / 5 + k / 4)),
    intensities: Array.from({ length: 32 }, () => 0),
  });
}

// channelId-keyed: 1 = /cmd_vel, 2 = /scan, 3 = /chatter (Header)
// (note: we use a Header on /chatter purely so the demo has a non-trivial 3rd
//  topic — std_msgs/Header is a bona fide ROS 2 type.)
const cmdVelMessages = Array.from({ length: 50 }, (_, i) => ({
  topic: "/cmd_vel",
  type: "geometry_msgs/msg/Twist",
  codec: Twist,
  value: makeTwist(i),
  logTime: tAt(i, 10),
}));
const scanMessages = Array.from({ length: 25 }, (_, i) => ({
  topic: "/scan",
  type: "sensor_msgs/msg/LaserScan",
  codec: LaserScan,
  value: makeScan(i),
  logTime: tAt(i, 5),
}));
const headerMessages = Array.from({ length: 5 }, (_, i) => ({
  topic: "/chatter",
  type: "std_msgs/msg/Header",
  codec: Header,
  value: makeHeader(i),
  logTime: tAt(i, 1),
}));

const allMessages = [...cmdVelMessages, ...scanMessages, ...headerMessages].sort(
  (a, b) => (a.logTime < b.logTime ? -1 : a.logTime > b.logTime ? 1 : 0),
);

const topicSchemas = new Map([
  ["/cmd_vel", "geometry_msgs/msg/Twist"],
  ["/scan", "sensor_msgs/msg/LaserScan"],
  ["/chatter", "std_msgs/msg/Header"],
]);

// ---------- MCAP --------------------------------------------------------------

class MemoryWritable {
  #buffers = [];
  #pos = 0n;
  async write(buffer) {
    this.#buffers.push(buffer);
    this.#pos += BigInt(buffer.length);
  }
  position() {
    return this.#pos;
  }
  toUint8Array() {
    const total = Number(this.#pos);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const b of this.#buffers) {
      out.set(b, offset);
      offset += b.length;
    }
    return out;
  }
}

async function generateMcap() {
  const writable = new MemoryWritable();
  const writer = new McapWriter({ writable, useChunks: true, useStatistics: true });

  await writer.start({ profile: "ros2", library: "ts-ros2bag-replay-sample" });

  // Register schema + channel per topic.
  /** @type {Map<string, number>} */
  const channelByTopic = new Map();
  const encoder = new TextEncoder();
  for (const [topic, type] of topicSchemas) {
    const schemaId = await writer.registerSchema({
      name: type,
      encoding: "ros2msg",
      data: encoder.encode(`# ${type} (placeholder schema text)`),
    });
    const channelId = await writer.registerChannel({
      schemaId,
      topic,
      messageEncoding: "cdr",
      metadata: new Map(),
    });
    channelByTopic.set(topic, channelId);
  }

  let sequence = 0;
  for (const m of allMessages) {
    const channelId = channelByTopic.get(m.topic);
    const data = new Uint8Array(m.codec.encode(m.value));
    await writer.addMessage({
      channelId,
      sequence: sequence++,
      logTime: m.logTime,
      publishTime: m.logTime,
      data,
    });
  }
  await writer.end();
  return writable.toUint8Array();
}

// ---------- SQLite (.db3) -----------------------------------------------------

async function generateDb3() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(`
    CREATE TABLE schema(schema_version INTEGER PRIMARY KEY, ros_distro TEXT NOT NULL);
    CREATE TABLE metadata(id INTEGER PRIMARY KEY, metadata_version INTEGER NOT NULL, metadata TEXT NOT NULL);
    CREATE TABLE topics(
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      serialization_format TEXT NOT NULL,
      offered_qos_profiles TEXT NOT NULL
    );
    CREATE TABLE messages(
      id INTEGER PRIMARY KEY,
      topic_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      data BLOB NOT NULL
    );
    CREATE INDEX timestamp_idx ON messages(timestamp);
    INSERT INTO schema(schema_version, ros_distro) VALUES (4, 'humble');
  `);

  // Embed minimal valid metadata.yaml so readers can pull start time / duration.
  const metadataYaml = [
    "rosbag2_bagfile_information:",
    "  version: 5",
    "  storage_identifier: sqlite3",
    "  starting_time:",
    `    nanoseconds_since_epoch: ${startNs.toString()}`,
    "  duration:",
    `    nanoseconds: ${durationNs.toString()}`,
    `  message_count: ${allMessages.length}`,
    "",
  ].join("\n");
  const insertMeta = db.prepare(
    "INSERT INTO metadata(metadata_version, metadata) VALUES(?, ?)",
  );
  insertMeta.run([5, metadataYaml]);
  insertMeta.free();

  /** @type {Map<string, number>} */
  const topicIds = new Map();
  let nextTopicId = 1;
  const insertTopic = db.prepare(
    "INSERT INTO topics(id, name, type, serialization_format, offered_qos_profiles) VALUES (?, ?, ?, ?, ?)",
  );
  for (const [topic, type] of topicSchemas) {
    insertTopic.run([nextTopicId, topic, type, "cdr", ""]);
    topicIds.set(topic, nextTopicId);
    nextTopicId++;
  }
  insertTopic.free();

  // Nanoseconds-since-epoch (~1.7e18) exceeds Number.MAX_SAFE_INTEGER, so
  // route the timestamp through CAST(? AS INTEGER) and bind as a string. SQLite
  // stores it as a true 64-bit INTEGER and ordering / comparisons are exact.
  const insertMsg = db.prepare(
    "INSERT INTO messages(topic_id, timestamp, data) VALUES (?, CAST(? AS INTEGER), ?)",
  );
  for (const m of allMessages) {
    const topicId = topicIds.get(m.topic);
    const data = new Uint8Array(m.codec.encode(m.value));
    insertMsg.run([topicId, m.logTime.toString(), data]);
  }
  insertMsg.free();

  const bytes = db.export();
  db.close();
  return bytes;
}

// ---------- Main ------------------------------------------------------------

const mcap = await generateMcap();
writeFileSync(resolve(outDir, "sample.mcap"), mcap);
console.log(`✔ sample.mcap   ${(mcap.length / 1024).toFixed(1)} KB`);

const db3 = await generateDb3();
writeFileSync(resolve(outDir, "sample.db3"), db3);
console.log(`✔ sample.db3    ${(db3.length / 1024).toFixed(1)} KB`);

console.log(
  `\n${allMessages.length} messages across ${topicSchemas.size} topics, ${
    Number(durationNs) / 1e9
  }s long.`,
);
