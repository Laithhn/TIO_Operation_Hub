import { useImperativeHandle, useRef } from 'react';

import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import { Title } from './title/Title';
import { ToggleButton } from './toggleButton/ToggleButton';
import * as css from './toolbar.scss';
import { type ToolbarProps, toolbarStylingProps } from './toolbar.types';


/**
 * React component of the layout component "Toolbar".
 */
const Toolbar = ({
  ref, id, tabBarItemId = '', withLine = false, title = '', titleType = 'headline',
  subTitle = '', centerTitle = false, hideFollowing, disableToggleButton = false, onToggleFollowing,
  children, ...restProps
}: ToolbarProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const toolbarElemRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, toolbarStylingProps, { addCombinedStyle: true });

  // the ground the toolbar's own colour sets, if it has one
  const ownGround = elemStyle?.['--ground'];
  const showToggleButton = (typeof hideFollowing === 'boolean');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: toolbarElemRef.current?.clientLeft,
    clientWidth: toolbarElemRef.current?.clientWidth,
    clientTop: toolbarElemRef.current?.clientTop,
    clientHeight: toolbarElemRef.current?.clientHeight,
    getBoundingClientRect: () => toolbarElemRef.current?.getBoundingClientRect(),
    contains: (other: Node | null) => toolbarElemRef.current?.contains(other),
  }), []);


  /**
   * Handler for the callback prop "onClick" of the sub-component "ToggleButton".
   */
  const handleToggleFollowing: React.ComponentProps<typeof ToggleButton>['onClick'] = (event) => {
    onToggleFollowing?.({ event });
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const toolbarClasses = classNames(css.toolbar, {
    [css.withToggleButton]: showToggleButton,
    [css.withLine]: withLine,
    // the line lies on the toolbar's own edge, so it follows the toolbar's own ground where it has one
    [css.groundDark]: (ownGround === 'dark'),
    [css.groundLight]: (ownGround === 'light'),
  });

  return (
    <div
      ref={toolbarElemRef}
      {...(id && { id })}
      {...(tabBarItemId && { role: 'tabpanel', 'aria-labelledby': tabBarItemId })}
      className={toolbarClasses}
      style={elemStyle}
    >
      {showToggleButton && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <ToggleButton icon={hideFollowing ? 'NAVIUP' : 'NAVIDOWN'} disable={disableToggleButton} onClick={handleToggleFollowing} />
      )}
      {!!title && (
        <Title
          title={title}
          titleType={titleType}
          subTitle={subTitle}
          centerTitle={centerTitle}
        />
      )}
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
};

Toolbar.displayName = 'Toolbar';


export { Toolbar };
