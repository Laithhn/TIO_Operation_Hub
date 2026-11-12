export interface MinimizedModwinProps {
  readonly id: string;
  readonly initialLeft: number;
  readonly initialBottom: number;
  readonly onSetPositions: ({ id, left, bottom }: { id: string; left: number; bottom: number }) => void;
  readonly onClose: (id: string) => void;
}
