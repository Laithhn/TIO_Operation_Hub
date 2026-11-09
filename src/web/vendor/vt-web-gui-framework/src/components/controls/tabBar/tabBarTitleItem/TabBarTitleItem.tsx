import { useImperativeHandle, useRef } from 'react';

import { useInteractions } from 'components/hooks/useInteractions';
import type { GroundStyle } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber } from 'utils/type';

import * as css from './tabBarTitleItem.scss';
import type { TabBarTitleItemProps } from './tabBarTitleItem.types';


/**
 * React sub-component "TabBarTitleItem" of the control component "TabBar": a tab that shows a title
 * and, optionally, a subtitle.
 */
const TabBarTitleItem = ({
  ref, selected = false, keyboardEntry = false, markerGround, backgroundMarker = false, id,
  panelId = '', disable = false, title = '', subTitle = '', onClick,
}: TabBarTitleItemProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const itemElemRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isWithSubTitle = isNonEmptyStringOrNumber(subTitle);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  // The tab bar reads the position of its tabs through this handle: where the tab begins along the
  // bar's axis and how long it is. Both come from the element's border box - the offset counts to
  // that box's near edge, so the size has to be that box's too, or the two would disagree by the
  // width of a border - and both are measured against the scrolling list, the offset parent.
  useImperativeHandle(ref, () => ({
    getPosition: (isVertical) => {
      const elem = itemElemRef.current;

      if (!elem) {
        return undefined;
      }

      return isVertical
        ? { offset: elem.offsetTop, dim: elem.offsetHeight }
        : { offset: elem.offsetLeft, dim: elem.offsetWidth };
    },
    focus: () => {
      itemElemRef.current?.focus();
    },
  }), []);


  const { interactionProps } = useInteractions<HTMLDivElement>({
    enablePointer: true,
    enableKeyboard: true,
    enableFocus: true,
    disableAllEvents: disable,
    // A bar too short for its tabs scrolls by touch, and the list that scrolls is the tab's parent.
    // Without this the hook would stop every touch on the tab, and the tabs cover the bar - so the
    // gesture would reach the list over the bar's padding alone.
    enableTouchPropagation: true,
    // One tab of the bar is where the keyboard enters it and the others are reachable by the arrow
    // keys, which the bar handles (see TabBar.tsx). A disabled tab is reachable by neither: the
    // hook answers "disableAllEvents" with a tab index of -1 whatever stands here.
    tabIndex: keyboardEntry ? 0 : -1,
    onClick: (event) => {
      onClick?.({ id, event });
    },
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const itemClasses = classNames(css.tabBarTitleItem, {
    // The bar's marker decides whether the tab shows a veil under the pointer and the focus or the
    // underline instead. The selection is a class of its own because the underline appearance
    // rests the selected tab's lettering at full opacity where it thins the others.
    [css.isBackgroundMarker]: backgroundMarker,
    [css.selected]: selected,
    [css.disabled]: disable,
  });

  const letteringClasses = {
    [css.typoDisabled]: disable,
  };

  return (
    <div
      ref={itemElemRef}
      id={id}
      role="tab"
      aria-selected={selected}
      {...(panelId && { 'aria-controls': panelId })}
      className={itemClasses}
      // the tab on a filled marker stands on the marker's colour, and its lettering follows it
      {...(markerGround && { style: { '--ground': markerGround } as GroundStyle })}
      {...interactionProps}
    >
      <span className={classNames(css.title, letteringClasses)}>{title}</span>
      {isWithSubTitle && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <span className={classNames(css.subTitle, letteringClasses)}>{subTitle}</span>
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

TabBarTitleItem.displayName = 'TabBarTitleItem';


export { TabBarTitleItem };
