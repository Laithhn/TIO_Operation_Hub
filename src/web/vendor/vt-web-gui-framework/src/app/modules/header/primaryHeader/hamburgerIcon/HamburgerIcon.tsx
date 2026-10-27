import { layout } from 'assets/styles';
import { classNames } from 'utils/classNames';

import { viewbox } from 'VtWebGuiIcons/src';

import * as css from './hamburgerIcon.scss';
import type { HamburgerIconProps } from './hamburgerIcon.types';


const iconSizePx = `${layout.header.iconSize}px`;

// the pathes are based on icon "BURGERMENU"
const pathTop = 'M21,7H4C3.447,7 3,6.553 3,6 3,5.447 3.447,5 4,5H21C 21.553,5 22,5.447 22,6 22,6.553 21.553,7 21,7Z';
const pathCenter = 'M21,13H4C3.447,13 3,12.553 3,12 3,11.447 3.447,11 4,11H21C 21.553,11 22,11.447 22,12 22,12.553 21.553,13 21,13Z';
const pathBottom = 'M21,19H4C 3.447,19 3,18.553 3,18 3,17.447 3.447,17 4,17H21C 21.553,17 22,17.447 22,18 22,18.553 21.553,19 21,19Z';


/**
 * React sub-component of the app module "Header" to show the hamburger menu icon in the
 * primary section of the header.
 */
const HamburgerIcon = ({ isHamburgerMenuVisible, onToggleHamburgerMenu }: HamburgerIconProps) => {
  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for synthetic React mouse event "onClick" on the hamburger icon element.
   */
  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.stopPropagation();
    onToggleHamburgerMenu();
  };


  /**
   * Handler for synthetic React keyboard event "onKeyUp" on the hamburger icon element.
   */
  const handleKeyUp: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    if ((event.key === 'Enter') || (event.key === ' ')) {
      event.stopPropagation();
      onToggleHamburgerMenu();
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

  const burgerMenuIconClasses = classNames(css.hamburgerIcon, {
    [css.active]: isHamburgerMenuVisible,
  });

  return (
    <span
      id="viwgf_primaryHeader_hamburgerIcon"
      role="button"
      // the icon has no text, so this names the button for a screen reader
      aria-label="Menu"
      tabIndex={0}
      className={burgerMenuIconClasses}
      onClick={handleClick}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
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
};

HamburgerIcon.displayName = 'HamburgerIcon';


export { HamburgerIcon };
