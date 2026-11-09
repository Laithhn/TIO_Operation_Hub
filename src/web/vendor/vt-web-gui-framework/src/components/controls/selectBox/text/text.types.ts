export interface TextProps {
  readonly disable: boolean;
  readonly noOptionHint: string;
  readonly option: {
    readonly value: string | number;
    readonly text?: string;
    readonly isItalic?: boolean;
  } | null;
}
