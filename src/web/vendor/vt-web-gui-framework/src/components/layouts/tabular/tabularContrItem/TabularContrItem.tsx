import { useImperativeHandle, useRef } from 'react';

import { useStylingProps } from 'components/hooks/useStylingProps';
import { classNames } from 'utils/classNames';

import * as css from './tabularContrItem.scss';
import { type TabularContrItemProps, tabularContrItemUsedStylingProps } from './tabularContrItem.types';


/**
 * React component of the sub-component "TabularContrItem" of the layout component "Tabular", an
 * individual container item that can be used as child of a tabular.
 */
const TabularContrItem = ({
  ref, tabularStyle = 'line', children, ...restProps
}: TabularContrItemProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const tabularContrItemElemRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // the spacing, colour and radius props injected by the tabular are part of "restProps" and are
  // derived here like any other styling prop
  const { elemStyle } = useStylingProps(restProps, tabularContrItemUsedStylingProps, { addCombinedStyle: true });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getBoundingClientRect: () => tabularContrItemElemRef.current?.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const tabularContrItemClasses = classNames(css.tabularContrItem, {
    [css.tabularStyleIsLine]: (tabularStyle === 'line'),
    [css.tabularStyleIsBackground]: (tabularStyle === 'background'),
  });

  return (
    <div ref={tabularContrItemElemRef} className={tabularContrItemClasses} style={elemStyle}>
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
};

TabularContrItem.displayName = 'TabularContrItem';


export { TabularContrItem };
