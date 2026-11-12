import { classNames } from 'utils/classNames';

import * as css from './separator.scss';
import type { SeparatorProps } from './separator.types';


/**
 * React sub-component of the control component "DateTimePicker" to show a separator for
 * the single parts of the date and time picker control element.
 */
const Separator = ({ dense, value }: SeparatorProps) => ((value === '\t')
  ? <span className={classNames(css.spacer, { [css.dense]: dense })} />
  : <span className={css.separator}>{value}</span>
);

Separator.displayName = 'Separator';


export { Separator };
