import { CheckBox, type CheckBoxProps, CheckBoxStatus } from 'components/controls/checkBox';
import { classNames } from 'utils/classNames';

import { getIconPath, iconExists, viewbox } from 'VtWebGuiIcons/src';

import * as css from './menuItem.scss';
import type { MenuItemProps } from './menuItem.types.ts';


/**
 * React sub-component of a menu item / entry of the popup component "Menu". It can be used
 * as well in the long menu (component "LongMenu") as in the deep menu (component "DeepMenu").
 */
const MenuItem = ({
  ref, id, disable, highlight, text, leadingIcon, trailingIcon, checkBoxValue, onClick,
}: MenuItemProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isCheckBox = (checkBoxValue !== undefined);
  const isLeadingIcon = (leadingIcon !== undefined) && !isCheckBox;
  const isTrailingIcon = (trailingIcon !== undefined);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the synthetic React event "onClick" on the main element of the menu item.
   */
  const handleClickMenuItem: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    onClick({ id, event });
  };


  /**
   * Handler for the synthetic React event "onKeyDown" on the main element of the menu item.
   */
  const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.stopPropagation();
        onClick({ id, event });
        break;
      // no default
    }
  };


  /**
   * Handler for the callback prop "onClick" of the control component "CheckBox".
   */
  const handleClickCheckBox: NonNullable<CheckBoxProps['onClick']> = ({ event }) => {
    event.stopPropagation();
    onClick({ id, event });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const menuItemClasses = classNames(css.menuItem, {
    [css.isLeadingIconOnly]: (isLeadingIcon || isCheckBox) && !isTrailingIcon,
    [css.isTrailingIconOnly]: !isLeadingIcon && !isCheckBox && isTrailingIcon,
    [css.areBothIcons]: (isLeadingIcon || isCheckBox) && isTrailingIcon,
    [css.disabled]: disable,
    [css.active]: highlight,
  });


  return (
    <span
      ref={ref}
      role="button"
      aria-disabled={disable}
      className={menuItemClasses}
      {...(!disable && {
        tabIndex: 0,
        onClick: handleClickMenuItem,
        onKeyDown: handleKeyDown,
      })}
    >
      {isLeadingIcon && iconExists(leadingIcon) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <svg className={css.leadingIcon} width="20px" height="20px" viewBox={viewbox}>
          <path d={getIconPath(leadingIcon)} />
        </svg>
      )}
      {isCheckBox && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <CheckBox
          gridArea="leadingIcon"
          justifySelf="start"
          status={disable ? CheckBoxStatus.DISABLED : CheckBoxStatus.IDLE}
          value={checkBoxValue}
          onClick={handleClickCheckBox}
        />
      )}
      <span className={css.caption}>{text}</span>
      {isTrailingIcon && (typeof trailingIcon === 'string') && iconExists(trailingIcon) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <svg className={css.trailingIcon} width="20px" height="20px" viewBox={viewbox}>
          <path d={getIconPath(trailingIcon)} />
        </svg>
      )}
      {isTrailingIcon && ((typeof trailingIcon === 'number') || !iconExists(trailingIcon)) && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <span className={css.trailingIcon}>{trailingIcon}</span>
      )}
    </span>
  );
  //                                                                                  </editor-fold>
};

MenuItem.displayName = 'MenuItem';


export { MenuItem };
