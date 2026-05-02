import { EncapsulationKind, flagsForKind } from "../../shared/encapsulation";

const HEADER_SIZE = 4;

export interface CdrSizeCalculatorOptions {
  readonly kind?: EncapsulationKind;
}

export class CdrSizeCalculator {
  readonly isCDR2: boolean;
  private readonly origin: number;
  private currentOffset: number;

  constructor(options: CdrSizeCalculatorOptions = {}) {
    const kind = options.kind ?? EncapsulationKind.CDR_LE;
    this.isCDR2 = flagsForKind(kind).isCDR2;
    this.currentOffset = HEADER_SIZE;
    this.origin = HEADER_SIZE;
  }

  get size(): number {
    return this.currentOffset;
  }

  align(size: number): number {
    const effective = this.isCDR2 && size > 4 ? 4 : size;
    const remainder = (this.currentOffset - this.origin) % effective;
    if (remainder > 0) {
      this.currentOffset += effective - remainder;
    }
    return this.currentOffset;
  }

  int8(): number {
    return this.advance(1, 1);
  }

  uint8(): number {
    return this.advance(1, 1);
  }

  int16(): number {
    return this.advance(2, 2);
  }

  uint16(): number {
    return this.advance(2, 2);
  }

  int32(): number {
    return this.advance(4, 4);
  }

  uint32(): number {
    return this.advance(4, 4);
  }

  int64(): number {
    return this.advance(8, 8);
  }

  uint64(): number {
    return this.advance(8, 8);
  }

  float32(): number {
    return this.advance(4, 4);
  }

  float64(): number {
    return this.advance(8, 8);
  }

  boolean(): number {
    return this.advance(1, 1);
  }

  sequenceLength(): number {
    return this.uint32();
  }

  string(byteLength: number): number {
    this.uint32();
    this.currentOffset += byteLength + 1;
    return this.currentOffset;
  }

  private advance(alignSize: number, byteCount: number): number {
    this.align(alignSize);
    this.currentOffset += byteCount;
    return this.currentOffset;
  }
}
