import type { ScrollButtonDir, ScrollButtonPos, ScrollButtonProps } from '../scrollButton.types';


export interface ArrowButtonProps {
  readonly dir: ScrollButtonDir;
  readonly pos: ScrollButtonPos;
  readonly isRtl: boolean;
  readonly holdable: boolean;
  readonly disable: boolean;
  readonly onClick: NonNullable<ScrollButtonProps['onClick']>;
}
