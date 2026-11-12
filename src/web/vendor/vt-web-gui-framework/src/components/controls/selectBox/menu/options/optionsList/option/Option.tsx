import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber } from 'utils/type';

import * as css from './option.scss';
import type { OptionProps } from './option.types';


/**
 * React sub-component of an option item in the menu of the control component "SelectBox".
 */
const Option = <ValueType,>({
  value, text, disable, italic, dir, onClick,
}: OptionProps<ValueType>) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let modText;

  if (text) {
    modText = text;
  } else if (isNonEmptyStringOrNumber(value, { withoutInfinite: true })) {
    modText = value;
  } else {
    modText = '\u{a0}';
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onClick" to delegate click events of this option to the
   * parent component, returning the value of this option.
   */
  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    if (!disable) {
      onClick({ value, event });
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const optionClasses = classNames(css.option, {
    [css.typoDisabled]: disable,
    [css.italic]: italic,
  });

  // An option written against the list's direction says so for itself. It travels as the CSS
  // property rather than the HTML attribute, which is what the prop's type states, and it needs no
  // rule beside it: the option aligns its text to "start", so the direction moves the text to the
  // edge the reader of that language starts at, and carries the ellipsis along.
  return (
    <div // eslint-disable-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      key={String(value)}
      className={optionClasses}
      {...(dir && { style: { direction: dir } })}
      onClick={handleClick}
    >
      {modText}
    </div>
  );
  //                                                                                  </editor-fold>
};

Option.displayName = 'Option';


export { Option };
