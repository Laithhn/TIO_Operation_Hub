import { Card, type CardProps } from 'components/popups/card';

import { DeepMenu } from './deepMenu/DeepMenu';
import { LongMenu } from './longMenu/LongMenu';
import { borderRadiusKey } from './menu.consts';
import type { MenuProps } from './menu.types.ts';


/**
 * React component of the popup component "Menu".
 */
const Menu = ({
  id, show, anchorElemRef, placeBesideAnchorElem = false, limitMenu = Infinity, entries, onClick, onClose, children,
}: MenuProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const realEntries = entries ?? null;
  const isLongMenu = Array.isArray(realEntries) && (realEntries.length > limitMenu);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Card
      {...(borderRadiusKey && { borderRadius: borderRadiusKey })}
      {...(id && { id })}
      {...((typeof show === 'boolean') && { show })}
      anchorElemRef={anchorElemRef}
      placeBesideAnchorElem={placeBesideAnchorElem}
      {...(onClose && {
        onClickBeside: onClose as NonNullable<CardProps['onClickBeside']>,
        onPressEscape: onClose as NonNullable<CardProps['onPressEscape']>,
        onMoveAnchorElem: onClose as NonNullable<CardProps['onMoveAnchorElem']>,
      })}
    >
      {children}
      {isLongMenu
        ? (
          <LongMenu entries={realEntries} limitMenu={limitMenu} {...(onClick && { onClick })} />
        )
        : (
          <DeepMenu entries={realEntries} {...(onClick && { onClick })} />
        )}
    </Card>
  );
  //                                                                                  </editor-fold>
};

Menu.displayName = 'Menu';


export { Menu };
