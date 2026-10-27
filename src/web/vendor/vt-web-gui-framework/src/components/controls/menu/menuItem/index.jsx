import PropTypes from 'prop-types';
import { memo, useRef, useCallback } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import Enums from 'assets/enums';
import CheckBox, { TICKBOX_MIXED, CheckBoxState } from 'components/controls/checkBox';
import classNames from 'utils/classNames';

import css from './menuItem.scss';


/**
 *
 */
const MenuItem = memo(({
  id, disabled, highlighted, text, leadingIcon, trailingIcon, isCheckbox, checkboxValue, onClick,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const elemRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, iconExists, getIconPath } = useIconsAsync();

  const isLeadingIcon = (leadingIcon !== MenuItem.defaultProps.leadingIcon) || isCheckbox;
  const isTrailingIcon = (trailingIcon !== MenuItem.defaultProps.trailingIcon);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleClickMenuItem = (event) => {
    onClick(id, elemRef, event);
  };


  /**
   *
   */
  const handleKeyDown = (event) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.stopPropagation();
        onClick(id, elemRef, event);
        break;
      // no default
    }
  };


  /**
   *
   */
  const handleClickCheckbox = useCallback((_, event) => {
    event.stopPropagation();
    onClick(id, elemRef, event);
  }, [id, onClick]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const menuItemClasses = classNames(css.menuItem, {
    [css.isLeadingIconOnly]: isLeadingIcon && !isTrailingIcon,
    [css.isTrailingIconOnly]: !isLeadingIcon && isTrailingIcon,
    [css.areBothIcons]: isLeadingIcon && isTrailingIcon,
    [css.typoDisabled]: disabled,
    [css.highlighted]: highlighted,
  });

  return (
    <span
      ref={elemRef}
      role="button"
      aria-disabled={disabled}
      {...((process.env.NODE_ENV === 'development') && { id: `menu__menuItem__${id}` })}
      className={menuItemClasses}
      {...(!disabled && {
        tabIndex: 0,
        onClick: handleClickMenuItem,
        onKeyDown: handleKeyDown,
      })}
    >
      {isLeadingIcon && !isCheckbox && iconExists(leadingIcon) && (
        <svg className={css.menuItemLeadingIcon} width="20px" height="20px" viewBox={viewbox}>
          <path d={getIconPath(leadingIcon)} />
        </svg>
      )}
      {isCheckbox && (
        <CheckBox
          gridArea="leadingIcon"
          justifySelf={Enums.PlaceSelfItems.START}
          state={disabled ? CheckBoxState.DISABLED : CheckBoxState.IDLE}
          value={checkboxValue}
          onClick={handleClickCheckbox}
        />
      )}
      <span className={css.menuItemText}>{text}</span>
      {isTrailingIcon && (iconExists(trailingIcon)
        ? (
          <svg className={css.menuItemTrailingIcon} width="20px" height="20px" viewBox={viewbox}>
            <path d={getIconPath(trailingIcon)} />
          </svg>
        ) : (
          <span className={css.menuItemTrailingIcon}>{trailingIcon}</span>
        )
      )}
    </span>
  );
  //                                                                                  </editor-fold>
});

MenuItem.displayName = 'MenuItem';

MenuItem.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  disabled: PropTypes.bool,
  highlighted: PropTypes.bool,
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  leadingIcon: PropTypes.string,
  trailingIcon: PropTypes.string,
  isCheckbox: PropTypes.bool,
  checkboxValue: PropTypes.oneOf([true, false, TICKBOX_MIXED]),
  onClick: PropTypes.func,
};

MenuItem.defaultProps = {
  disabled: false,
  highlighted: false,
  leadingIcon: null,
  trailingIcon: null,
  isCheckbox: false,
  checkboxValue: false,
  onClick() {},
};

export default MenuItem;
