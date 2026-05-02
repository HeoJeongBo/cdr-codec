import { EncapsulationKind, flagsForKind, isKnownKind } from "../../shared/encapsulation";

const HEADER_SIZE = 4;
const textDecoder = new TextDecoder("utf-8");

export class CdrReader {
  readonly kind: EncapsulationKind;
  readonly littleEndian: boolean;
  readonly isCDR2: boolean;
  private readonly view: DataView;
  private readonly origin: number;
  private offset: number;

  constructor(data: ArrayBufferView) {
    if (data.byteLength < HEADER_SIZE) {
      throw new Error(`CDR buffer too small: ${data.byteLength} < ${HEADER_SIZE} bytes`);
    }
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const kindByte = this.view.getUint8(1);
    if (!isKnownKind(kindByte)) {
      throw new Error(`Unknown encapsulation kind: 0x${kindByte.toString(16)}`);
    }
    this.kind = kindByte;
    const flags = flagsForKind(this.kind);
    this.littleEndian = flags.littleEndian;
    this.isCDR2 = flags.isCDR2;
    this.offset = HEADER_SIZE;
    this.origin = HEADER_SIZE;
  }

  get byteOffset(): number {
    return this.offset;
  }

  get byteLength(): number {
    return this.view.byteLength;
  }

  align(size: number): void {
    const effective = this.isCDR2 && size > 4 ? 4 : size;
    const remainder = (this.offset - this.origin) % effective;
    if (remainder > 0) {
      this.offset += effective - remainder;
    }
  }

  int8(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  uint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  int16(): number {
    this.align(2);
    const value = this.view.getInt16(this.offset, this.littleEndian);
    this.offset += 2;
    return value;
  }

  uint16(): number {
    this.align(2);
    const value = this.view.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return value;
  }

  int32(): number {
    this.align(4);
    const value = this.view.getInt32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }

  uint32(): number {
    this.align(4);
    const value = this.view.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }

  int64(): bigint {
    this.align(8);
    const value = this.view.getBigInt64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }

  uint64(): bigint {
    this.align(8);
    const value = this.view.getBigUint64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }

  float32(): number {
    this.align(4);
    const value = this.view.getFloat32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }

  float64(): number {
    this.align(8);
    const value = this.view.getFloat64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }

  boolean(): boolean {
    return this.uint8() !== 0;
  }

  sequenceLength(): number {
    return this.uint32();
  }

  string(): string {
    const length = this.sequenceLength();
    if (length === 0) {
      return "";
    }
    const bytes = new Uint8Array(
      this.view.buffer,
      this.view.byteOffset + this.offset,
      length - 1,
    );
    const value = textDecoder.decode(bytes);
    this.offset += length;
    return value;
  }

  int8Array(count?: number): Int8Array {
    const length = count ?? this.sequenceLength();
    const result = new Int8Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.int8();
    }
    return result;
  }

  uint8Array(count?: number): Uint8Array {
    const length = count ?? this.sequenceLength();
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.uint8();
    }
    return result;
  }

  int16Array(count?: number): Int16Array {
    const length = count ?? this.sequenceLength();
    const result = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.int16();
    }
    return result;
  }

  uint16Array(count?: number): Uint16Array {
    const length = count ?? this.sequenceLength();
    const result = new Uint16Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.uint16();
    }
    return result;
  }

  int32Array(count?: number): Int32Array {
    const length = count ?? this.sequenceLength();
    const result = new Int32Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.int32();
    }
    return result;
  }

  uint32Array(count?: number): Uint32Array {
    const length = count ?? this.sequenceLength();
    const result = new Uint32Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.uint32();
    }
    return result;
  }

  int64Array(count?: number): BigInt64Array {
    const length = count ?? this.sequenceLength();
    const result = new BigInt64Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.int64();
    }
    return result;
  }

  uint64Array(count?: number): BigUint64Array {
    const length = count ?? this.sequenceLength();
    const result = new BigUint64Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.uint64();
    }
    return result;
  }

  float32Array(count?: number): Float32Array {
    const length = count ?? this.sequenceLength();
    const result = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.float32();
    }
    return result;
  }

  float64Array(count?: number): Float64Array {
    const length = count ?? this.sequenceLength();
    const result = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = this.float64();
    }
    return result;
  }
}
