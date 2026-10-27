export interface CheckNumberOptions {
  /** Set to true, to also check that the given value is neither +Infinity, -Infinity nor NaN. */
  withoutInfinite?: boolean;
  /** Set to true, to also check that the given value is not NaN. */
  withoutNaN?: boolean;
  /** Optionally define a minimum number (exclusive) for the given value (greater than). */
  gt?: number;
  /** Optionally define a minimum number (inclusive) for the given value (greater than or equal). */
  gte?: number;
  /** Optionally define a maximum number (exclusive) for the given value (less than). */
  lt?: number;
  /** Optionally define a maximum number (inclusive) for the given value (less than or equal). */
  lte?: number;
}
