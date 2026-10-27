import { memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { viewbox } from 'VtWebGuiIcons/src';

import defines from 'assets/defines';
import { actions, selectors } from 'store';
import classNames from 'utils/classNames';

import css from './burgerIcon.scss';


const iconSizePx = `${defines.layout.header.iconSize}px`;

// the pathes are based on icon "BURGERMENU"
const pathTop = 'M21,7H4C3.447,7 3,6.553 3,6 3,5.447 3.447,5 4,5H21C 21.553,5 22,5.447 22,6 22,6.553 21.553,7 21,7Z';
const pathCenter = 'M21,13H4C3.447,13 3,12.553 3,12 3,11.447 3.447,11 4,11H21C 21.553,11 22,11.447 22,12 22,12.553 21.553,13 21,13Z';
const pathBottom = 'M21,19H4C 3.447,19 3,18.553 3,18 3,17.447 3.447,17 4,17H21C 21.553,17 22,17.447 22,18 22,18.553 21.553,19 21,19Z';


/**
 * Memoized React component of the hamburger menu icon.
 */
const BurgerIcon = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const showBurgerMenu = useSelector(selectors.menus.common.isMenuPopupVisible);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for synthetic React event "onClick" on the hamburger menu button.
   */
  const handleToggleBurgerMenu = (event) => {
    event.stopPropagation();
    dispatch(actions.menus.common.toggleMenuPopup());
  };


  /**
   *
   */
  const handleKeyUp = (event) => {
    if ((event.key === 'Enter') || (event.key === ' ')) {
      handleToggleBurgerMenu(event);
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

  const burgerManuIconClasses = classNames(css.burgerIcon, {
    [css.active]: showBurgerMenu,
  });

  return (
    <span
      role="button"
      tabIndex="0"
      {...((process.env.NODE_ENV === 'development') && { id: 'header__burgerIcon' })}
      className={burgerManuIconClasses}
      onClick={handleToggleBurgerMenu}
      onPointerDown={(event) => { event.stopPropagation(); }}
      onKeyUp={handleKeyUp}
    >
      <svg width={iconSizePx} height={iconSizePx} viewBox={viewbox}>
        <path d={pathTop} />
        <path d={pathCenter} />
        <path d={pathBottom} />
      </svg>
    </span>
  );
  //                                                                                  </editor-fold>
});

BurgerIcon.displayName = 'BurgerIcon';

export default BurgerIcon;
