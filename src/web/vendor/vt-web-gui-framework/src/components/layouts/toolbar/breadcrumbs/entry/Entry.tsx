import { SelectBox, SelectBoxStatus } from 'components/controls/selectBox';
import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber } from 'utils/type';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import * as css from './entry.scss';
import type { EntryProps } from './entry.types';


/**
 * React sub-component of an entry, optionally clickable, or of an entry container with a
 * {@link SelectBox} of the sub-component "Breadcrumbs" of the layout component "MainToolbar".
 */
const Entry = ({
  id, disable, value, icon, options, onSelect,
}: EntryProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isValue = isNonEmptyStringOrNumber(value);
  const isIcon = !!icon;
  const isClickable = (typeof onSelect === 'function');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onSelect" of the control component "SelectBox".
   */
  const handleSelectBox: NonNullable<React.ComponentProps<typeof SelectBox>['onSelect']> = ({ value: selectedValue, event }) => {
    onSelect?.({ id, value: selectedValue, ...(event && { event }) });
  };


  /**
   * Handler for the synthetic React event "onClick" of the native main element of the breadcrumbs
   * entry.
   */
  const handleClickEntry: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    onSelect?.({ id, value, event });
  };


  /**
   * Handler for the synthetic React event "onKeyUp" of the native main element of the breadcrumbs
   * entry.
   */
  const handleKeyUpEntry: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    onSelect?.({ id, value, event });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (options) {
    return (
      <span className={css.entryContr}>
        <SelectBox<(string | number)>
          status={(disable || !isClickable) ? SelectBoxStatus.DISABLED : SelectBoxStatus.IDLE}
          dense
          options={options}
          value={value}
          onSelect={handleSelectBox}
        />
      </span>
    );
  }


  if (!isValue && !isIcon) {
    return null;
  }


  const entryClasses = classNames(css.entry, {
    [css.active]: !isClickable,
    [css.disabled]: disable,
  });

  return (
    <span
      className={entryClasses}
      {...(isClickable && {
        role: 'button',
        'aria-disabled': disable,
        tabIndex: 0,
      })}
      {...(isClickable && !disable && {
        onClick: handleClickEntry,
        onKeyUp: handleKeyUpEntry,
      })}
    >
      {isIcon && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <svg width="20px" height="20px" viewBox={viewbox}>
          <path d={getIconPath(icon)} />
        </svg>
      )}
      {isValue && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <span>{value}</span>
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

Entry.displayName = 'Entry';


export { Entry };
