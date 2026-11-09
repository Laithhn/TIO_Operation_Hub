import * as css from './options.scss';
import type { OptionsProps } from './options.types';
import { OptionsList } from './optionsList/OptionsList';


/**
 * React sub-component of the container in the menu of the control component "SelectBox",
 * that contains the list with the single option items (OptionsList). This component is not memoized
 * because its props (especially "top") change too frequently.
 */
const Options = <ValueType,>({ top, options, onSelectOption }: OptionsProps<ValueType>) => (
  <div
    className={css.options}
    style={{ transform: `translateY(${top}px)` }}
  >
    <OptionsList<ValueType>
      options={options}
      onSelectOption={onSelectOption}
    />
  </div>
);

Options.displayName = 'Options';


export { Options };
