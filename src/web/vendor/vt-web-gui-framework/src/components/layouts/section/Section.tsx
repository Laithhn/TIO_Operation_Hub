import { useImperativeHandle, useRef } from 'react';

import { Scrolling, type ScrollingHandle } from 'components/helpers/scrolling';
import { useDimensions } from 'components/hooks/useDimensions';
import { useInteractions } from 'components/hooks/useInteractions';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './section.scss';
import { type SectionClickEvent, type SectionProps, sectionStylingProps } from './section.types';


/**
 * React component of the layout component "Section", a universal structuring section for dashboard
 * contents of VtWebGuiFramework.
 */
const Section = ({
  ref, id, darkTheme, tabBarItemId = '', scrollBarV = false, scrollBarH = false,
  enableScrollingKeys = false, onClick, children, ...restProps
}: SectionProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const sectionElemRef = useRef<HTMLDivElement>(null);
  const scrollingHandleRef = useRef<ScrollingHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isFunction = (typeof children === 'function');
  const isScrolling = (scrollBarV || scrollBarH);
  const isClickable = !!onClick;
  const hasContactPane = (restProps.boxShadow === 'contact');
  const { clientWidth, clientHeight } = useDimensions({
    ref: isScrolling ? scrollingHandleRef : sectionElemRef,
    disable: !isFunction,
  });
  const { outerElemStyle, innerElemStyle, elemStyle } = useStylingProps(
    restProps, sectionStylingProps, { addCombinedStyle: !isScrolling, darkTheme },
  );
  // the ground of the section's own colour, or the one "darkTheme" states - what the veil of a
  // clickable section lies on
  const ownGround = outerElemStyle['--ground'];


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: sectionElemRef.current?.clientLeft,
    clientWidth: sectionElemRef.current?.clientWidth,
    clientTop: sectionElemRef.current?.clientTop,
    clientHeight: sectionElemRef.current?.clientHeight,
    getBoundingClientRect: () => sectionElemRef.current?.getBoundingClientRect(),
    contains: (other: Node | null) => sectionElemRef.current?.contains(other),
    ...scrollingHandleRef.current,
  }), []);


  /**
   * Handler for the callback prop "onClick" of the interactions hook, which reports a click of the
   * pointer as well as one made with Enter or the space key.
   */
  const handleClick = (event: SectionClickEvent) => {
    onClick?.({ event });
  };


  // The hook is called whatever the section is, because a hook has to be; what is conditional is
  // its options and whether its props are spread below. Spreading them unconditionally would give
  // every ordinary section an "aria-disabled" and a tab index.
  const { isPressed, interactionProps } = useInteractions<HTMLDivElement>({
    enablePointer: isClickable,
    enableKeyboard: isClickable,
    enableFocus: isClickable,
    ...(isClickable && { tabIndex: 0 }),
    onClick: handleClick,
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  let content;

  if (isFunction) {
    content = (clientWidth && clientHeight
      ? children({ width: clientWidth, height: clientHeight })
      : null
    );
  } else {
    content = children;
  }

  const sectionClasses = classNames(css.section, {
    [css.overflowHidden]: isFunction,
    // A scrolling section draws its pane on the outer element, the one that carries its background. A
    // clickable one carries the full pane of its own, whether "boxShadow" is set or not.
    [css.contactPane]: hasContactPane && !isScrolling && !isClickable,
    [css.clickable]: isClickable,
    ...(isClickable && {
      [css.groundDark]: (ownGround === 'dark'),
      [css.groundLight]: (ownGround === 'light'),
    }),
    // The pressed status comes from the hook rather than from the CSS pseudo-class ":active", which
    // the keyboard never reaches: a section held down with Enter or space has to take the press like
    // one held down by the pointer. Hover and focus stay with their pseudo-classes.
    [css.pressed]: isPressed,
  });

  // Section with scoll bar.
  if (isScrolling) {
    return (
      <Scrolling
        ref={scrollingHandleRef}
        {...(id && { id })}
        {...(tabBarItemId && { tabBarItemId })}
        {...(hasContactPane && !isClickable && { className: css.contactPane })}
        style={outerElemStyle}
        vertical={scrollBarV}
        horizontal={scrollBarH}
        enableKeys={enableScrollingKeys}
      >
        <div
          className={sectionClasses}
          style={innerElemStyle}
          {...(isClickable && {
            role: 'button',
            ...interactionProps,
          })}
        >
          {content}
        </div>
      </Scrolling>
    );
  }

  // Section without scroll bar.
  return (
    <div
      ref={sectionElemRef}
      {...(id && { id })}
      className={sectionClasses}
      style={elemStyle}
      {...(isClickable && {
        role: 'button',
        ...interactionProps,
      })}
      // The panel role stands after the button role and therefore wins it: a section holding the
      // content of a tab is announced as that first, and the click it may also take does not change
      // what the section is. The handler above stays either way.
      {...(tabBarItemId && { role: 'tabpanel', 'aria-labelledby': tabBarItemId })}
    >
      {content}
    </div>
  );
  //                                                                                  </editor-fold>
};

Section.displayName = 'Section';


export { Section };
