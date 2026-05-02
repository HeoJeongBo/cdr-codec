import { describe, expect, it } from "vitest";
import { detectFormat } from "../sources/detect";

function blobOf(bytes: ArrayLike<number>): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

describe("detectFormat", () => {
  it("recognizes the MCAP magic prefix", async () => {
    const head = [0x89, 0x4d, 0x43, 0x41, 0x50, 0x30, 0x0d, 0x0a, 0xff, 0xff];
    expect(await detectFormat(blobOf(head))).toBe("mcap");
  });

  it("recognizes the SQLite header string", async () => {
    const text = "SQLite format 3\0";
    const bytes = Array.from(text, (c) => c.charCodeAt(0));
    expect(await detectFormat(blobOf(bytes))).toBe("db3");
  });

  it("throws on unknown magic bytes", async () => {
    const garbage = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09];
    await expect(detectFormat(blobOf(garbage))).rejects.toThrow("Unrecognized");
  });

  it("throws on a buffer too short to identify", async () => {
    await expect(detectFormat(blobOf([0x89, 0x4d]))).rejects.toThrow("Unrecognized");
  });
});
