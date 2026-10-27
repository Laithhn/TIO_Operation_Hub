import { Option } from './option/Option';
import type { OptionsListProps } from './optionsList.types';


/**
 * React sub-component of the list in the menu of the control component "SelectBox", that contains
 * the single option items. It maps the options onto Option and renders no element of its own, so
 * what it separates is the mapping from the container that scrolls it.
 *
 * **It memoizes nothing**, where the comment here claimed until 2026-09-02 that this was its
 * purpose. Two things would have to hold for that, and neither does: the component carries no
 * memo(), and its "onSelectOption" is composed anew on every render of the select box - a memo()
 * would compare unequal every time and re-render regardless.
 */
const OptionsList = <ValueType,>({ options, onSelectOption }: OptionsListProps<ValueType>) => options.map(({
  value, text, isDisabled, isItalic, dir,
}) => (
  <Option<ValueType>
    key={String(value)}
    value={value}
    text={text}
    disable={isDisabled}
    italic={isItalic}
    dir={dir}
    onClick={onSelectOption}
  />
));

OptionsList.displayName = 'OptionsList';


export { OptionsList };
