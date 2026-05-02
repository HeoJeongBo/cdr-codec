export function hexDump(data: Uint8Array, withAscii = true): string {
  const lines: string[] = [];
  for (let i = 0; i < data.byteLength; i += 16) {
    const slice = data.slice(i, i + 16);
    const hex = Array.from(slice, (b) => b.toString(16).padStart(2, "0")).join(" ");
    if (!withAscii) {
      lines.push(`${i.toString(16).padStart(4, "0")}  ${hex}`);
      continue;
    }
    const ascii = Array.from(slice, (b) =>
      b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".",
    ).join("");
    lines.push(`${i.toString(16).padStart(4, "0")}  ${hex.padEnd(48)}  ${ascii}`);
  }
  return lines.join("\n");
}
