/**
 * An enumeration pattern, inspired by https://github.com/rauschma/enumify.
 *
 * @example
 * ```typescript
 * import { Enumify } from 'utils/enumify';
 *
 * class MyEnum extends Enumify {
 *   static EnumValueA = new MyEnum();
 *   static EnumValueB = new MyEnum();
 * }
 * MyEnum.closeEnum();
 * ```
 */
class Enumify {
  /** Static property with a list of all enumeration keys as strings. */
  static enumKeys: string[];
  /** Static property with a list of all enumeration values. */
  static enumValues: Enumify[];


  /**
   * Static method to set the key and the ordinal number of all enumeration values and to finally
   * distribute the data of them to the static properties enumKeys and enumValues.
   *
   * @example
   * ```typescript
   * class MyEnum extends Enumify {
   *   static EnumValueA = new MyEnum();
   *   static EnumValueB = new MyEnum();
   * }
   * MyEnum.closeEnum();
   * ```
   */
  static closeEnum(): void {
    const enumKeys: string[] = [];
    const enumValues: Enumify[] = [];

    Object.entries(this).forEach(([key, value]: [string, Enumify], idx: number) => {
      value.enumKey = key;
      value.enumOrdinal = idx;

      enumKeys.push(key);
      enumValues.push(value);
    });

    // important: only add more static properties *after* processing the enum entries.
    this.enumKeys = enumKeys;
    this.enumValues = enumValues;
  }


  /**
   * Static method to find en enumeration value by a given enumeration key as string.
   *
   * @param str - The given enumeration key or any string to test.
   * @returns The enumeration value if found or undefined, if the given value is invalid.
   */
  static enumValueOf(str: string): Enumify | undefined {
    const idx = this.enumKeys.indexOf(str);
    return (idx >= 0) ? this.enumValues[idx] : undefined;
  }


  /**
   * Static symbol iterator method to return iteratable object.
   */
  static [Symbol.iterator](): IterableIterator<Enumify> {
    return this.enumValues[Symbol.iterator]();
  }


  /** The enumeration key as string. */
  enumKey!: string;
  /** The zero based enumeration number. */
  enumOrdinal!: number;


  /**
   * Public method to return the concatenation of the name of the enumeration and the name of the
   * enumeration value, seperated by a dot.
   */
  toString(): string {
    return `${this.constructor.name}.${this.enumKey}`;
  }
}


export { Enumify };
