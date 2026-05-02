import { EncapsulationKind, flagsForKind } from "../../shared/encapsulation";

const HEADER_SIZE = 4;
const DEFAULT_INITIAL_SIZE = 256;
const textEncoder = new TextEncoder();

export interface CdrWriterOptions {
  readonly kind?: EncapsulationKind;
  readonly size?: number;
  readonly buffer?: ArrayBuffer;
}

export class CdrWriter {
  readonly kind: EncapsulationKind;
  readonly littleEndian: boolean;
  readonly isCDR2: boolean;
  private buffer: ArrayBuffer;
  private view: DataView;
  private readonly origin: number;
  private offset: number;

  constructor(options: CdrWriterOptions = {}) {
    this.kind = options.kind ?? EncapsulationKind.CDR_LE;
    const flags = flagsForKind(this.kind);
    this.littleEndian = flags.littleEndian;
    this.isCDR2 = flags.isCDR2;

    if (options.buffer != null) {
      if (options.buffer.byteLength < HEADER_SIZE) {
        throw new Error(
          `Provided buffer too small: ${options.buffer.byteLength} < ${HEADER_SIZE} bytes`,
        );
      }
      this.buffer = options.buffer;
    } else {
      const size = Math.max(options.size ?? DEFAULT_INITIAL_SIZE, HEADER_SIZE);
      this.buffer = new ArrayBuffer(size);
    }
    this.view = new DataView(this.buffer);

    this.view.setUint8(0, 0);
    this.view.setUint8(1, this.kind);
    this.view.setUint8(2, 0);
    this.view.setUint8(3, 0);

    this.offset = HEADER_SIZE;
    this.origin = HEADER_SIZE;
  }

  get data(): Uint8Array {
    return new Uint8Array(this.buffer, 0, this.offset);
  }

  get byteOffset(): number {
    return this.offset;
  }

  align(size: number): this {
    const effective = this.isCDR2 && size > 4 ? 4 : size;
    const remainder = (this.offset - this.origin) % effective;
    if (remainder > 0) {
      const padding = effective - remainder;
      this.ensureCapacity(padding);
      for (let i = 0; i < padding; i++) {
        this.view.setUint8(this.offset + i, 0);
      }
      this.offset += padding;
    }
    return this;
  }

  int8(value: number): this {
    this.ensureCapacity(1);
    this.view.setInt8(this.offset, value);
    this.offset += 1;
    return this;
  }

  uint8(value: number): this {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
    return this;
  }

  int16(value: number): this {
    this.align(2);
    this.ensureCapacity(2);
    this.view.setInt16(this.offset, value, this.littleEndian);
    this.offset += 2;
    return this;
  }

  uint16(value: number): this {
    this.align(2);
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, value, this.littleEndian);
    this.offset += 2;
    return this;
  }

  int32(value: number): this {
    this.align(4);
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, value, this.littleEndian);
    this.offset += 4;
    return this;
  }

  uint32(value: number): this {
    this.align(4);
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value, this.littleEndian);
    this.offset += 4;
    return this;
  }

  int64(value: bigint): this {
    this.align(8);
    this.ensureCapacity(8);
    this.view.setBigInt64(this.offset, value, this.littleEndian);
    this.offset += 8;
    return this;
  }

  uint64(value: bigint): this {
    this.align(8);
    this.ensureCapacity(8);
    this.view.setBigUint64(this.offset, value, this.littleEndian);
    this.offset += 8;
    return this;
  }

  float32(value: number): this {
    this.align(4);
    this.ensureCapacity(4);
    this.view.setFloat32(this.offset, value, this.littleEndian);
    this.offset += 4;
    return this;
  }

  float64(value: number): this {
    this.align(8);
    this.ensureCapacity(8);
    this.view.setFloat64(this.offset, value, this.littleEndian);
    this.offset += 8;
    return this;
  }

  boolean(value: boolean): this {
    return this.uint8(value ? 1 : 0);
  }

  sequenceLength(length: number): this {
    return this.uint32(length);
  }

  string(value: string): this {
    const bytes = textEncoder.encode(value);
    this.sequenceLength(bytes.byteLength + 1);
    this.ensureCapacity(bytes.byteLength + 1);
    new Uint8Array(this.buffer, this.offset, bytes.byteLength).set(bytes);
    this.view.setUint8(this.offset + bytes.byteLength, 0);
    this.offset += bytes.byteLength + 1;
    return this;
  }

  int8Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.int8(values[i] as number);
    }
    return this;
  }

  uint8Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.uint8(values[i] as number);
    }
    return this;
  }

  int16Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.int16(values[i] as number);
    }
    return this;
  }

  uint16Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.uint16(values[i] as number);
    }
    return this;
  }

  int32Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.int32(values[i] as number);
    }
    return this;
  }

  uint32Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.uint32(values[i] as number);
    }
    return this;
  }

  int64Array(values: ArrayLike<bigint>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.int64(values[i] as bigint);
    }
    return this;
  }

  uint64Array(values: ArrayLike<bigint>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.uint64(values[i] as bigint);
    }
    return this;
  }

  float32Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.float32(values[i] as number);
    }
    return this;
  }

  float64Array(values: ArrayLike<number>, writeLength = true): this {
    if (writeLength) {
      this.sequenceLength(values.length);
    }
    for (let i = 0; i < values.length; i++) {
      this.float64(values[i] as number);
    }
    return this;
  }

  toArrayBuffer(): ArrayBuffer {
    return this.buffer.slice(0, this.offset);
  }

  private ensureCapacity(additional: number): void {
    const required = this.offset + additional;
    if (required <= this.buffer.byteLength) {
      return;
    }
    let newSize = this.buffer.byteLength * 2;
    while (newSize < required) {
      newSize *= 2;
    }
    const next = new ArrayBuffer(newSize);
    new Uint8Array(next).set(new Uint8Array(this.buffer, 0, this.offset));
    this.buffer = next;
    this.view = new DataView(this.buffer);
  }
}
