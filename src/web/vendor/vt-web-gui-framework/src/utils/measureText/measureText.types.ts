export interface MeasureTextOptions {
  /** The font family as string. */
  fontFamily?: string;
  /** The font size as string, see assets/styles/_typo.scss. */
  fontSize?: string;
  /** The font weight as number, see assets/styles/_typo.scss. */
  fontWeight?: number;
  /** Set to true for an italic font. */
  italic?: boolean;
  /** Set to true to measure each line separately. */
  considerLineBreaks?: boolean;
}


export interface MeasureText {
  (text: string, options?: MeasureTextOptions): number;
  canvas?: HTMLCanvasElement | undefined;
}
