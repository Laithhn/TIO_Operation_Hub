import type { typo } from 'assets/styles';


/** The props of the React component of the helper component "LabelForControls". */
export interface LabelForControlsProps {
  readonly disable?: boolean;
  readonly label?: string | number;
  readonly labelType?: keyof Pick<typeof typo.typoSet, 'label' | 'value'>;
  readonly wrapLabel?: boolean;
}
