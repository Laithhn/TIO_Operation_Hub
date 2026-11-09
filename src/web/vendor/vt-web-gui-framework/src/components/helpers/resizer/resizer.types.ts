export interface ResizerProps {
  readonly enableResizeLeft?: boolean;
  readonly enableResizeRight?: boolean;
  readonly enableResizeTop?: boolean;
  readonly enableResizeBottom?: boolean;
  readonly position: {
    readonly left: number;
    readonly width: number;
    readonly top: number;
    readonly height: number;
  };
  readonly onSetPosition: React.Dispatch<React.SetStateAction<{
    left: number; width: number; top: number; height: number;
  }>>;
}
