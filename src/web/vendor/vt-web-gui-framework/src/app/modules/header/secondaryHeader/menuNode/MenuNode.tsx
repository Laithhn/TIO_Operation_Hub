import { useRef, useState } from 'react';

import type { JsContentFunc } from 'app/modules/content';
import * as modwinsSlice from 'app/modules/modwins/modwins.slice';
import { layout } from 'assets/styles';
import { useDispatch } from 'components/hooks/useDispatch';
import { useI18n } from 'components/hooks/useI18n';
import { useSelector } from 'components/hooks/useSelector';
import { Menu, type MenuEntry } from 'components/popups/menu';
import { type SecondaryMenuNode, secondaryMenuSlice } from 'store/menus/secondaryMenu';
import { getStore } from 'store/store';
import { classNames } from 'utils/classNames';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import * as css from './menuNode.scss';
import type { MenuNodeProps } from './menuNode.types';


/**
 *
 */
const buildMenuEntries = (
  ids: SecondaryMenuNode['submenuNodeIds'],
  menuNodes: ReturnType<typeof secondaryMenuSlice.selectAllMenuNodes>,
  translateText: ReturnType<typeof useI18n>['translateText'],
): MenuEntry[] => ids.map((id) => {
  const {
    caption, isHidden, isDisabled, icon, submenuNodeIds,
  } = menuNodes[id]!;

  return {
    id,
    isHidden,
    isDisabled,
    text: translateText(caption ?? ''),
    ...(icon && { icon }),
    subEntries: buildMenuEntries(submenuNodeIds, menuNodes, translateText),
  };
});


/**
 * React component of a link for a menu node that appears in the secondary section of the header.
 */
const MenuNode = ({ menuNode }: MenuNodeProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { translateText } = useI18n();

  const allMenuNodes = useSelector(secondaryMenuSlice.selectAllMenuNodes);

  const [showMenu, setShowMenu] = useState(false);

  const menuNodeLinkRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const icon = getIconPath(menuNode.icon ?? '');
  const iconSizePx = `${layout.header.iconSize}px`;

  const submenuEntries = buildMenuEntries(menuNode.submenuNodeIds, allMenuNodes, translateText);


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
   *
   */
  const handleClickMenuNodeEntry = ({ scope, contentPath, options }: SecondaryMenuNode) => {
    switch (scope) {
      // -----------------------------------------------------------------------------------------
      case 'modwin':
      // -----------------------------------------------------------------------------------------

        dispatch(modwinsSlice.startLoadingContent({
          contentPath,
          contentData: Object.keys(options).filter((key) => !key.startsWith('modwin')).reduce((acc, key) => ({ ...acc, [key]: options[key] }), {}),
          ...(options.modwinTitle && { title: options.modwinTitle }),
          ...(options.modwinWidth && { width: options.modwinWidth }),
          ...(options.modwinHeight && { height: options.modwinHeight }),
          ...(options.modwinIsDraggable && { isDraggable: options.modwinIsDraggable }),
          ...(options.modwinIsResizable && { isResizable: options.modwinIsResizable }),
          ...(options.modwinIsMinimizable && { isMinimizable: options.modwinIsMinimizable }),
          ...(options.modwinIsUnclosable && { isUnclosable: options.modwinIsUnclosable }),
          ...(options.modwinCloseByEscape && { closeByEscape: options.modwinCloseByEscape }),
          ...(options.modwinMultiple && { multiple: options.modwinMultiple }),
          ...(options.modwinIsExclusive && { isExclusive: options.modwinIsExclusive }),
          ...(options.modwinDimmedBackground && { dimmedBackground: options.modwinDimmedBackground }),
        }));
        break;

      // -----------------------------------------------------------------------------------------
      case 'js':
      // -----------------------------------------------------------------------------------------

        if (process.env['PATH_CONTENTS']) {
          import(/* webpackInclude: /content\.[jt]s$/i */process.env['PATH_CONTENTS'] + contentPath).then((module: { default: JsContentFunc }) => {
            module.default({
              ...getStore(),
              calledId: menuNode.id,
              contentData: Object.keys(options).filter((key) => !key.startsWith('modwin')).reduce((acc, key) => ({ ...acc, [key]: options[key] }), {}),
            });
          }).catch((e: unknown) => {
            throw new Error(`VIWGF/Frame > Header/SecondaryHeader/SecondaryLink: trying to load JavaScript content file from path "${contentPath}" failed:${(e instanceof Error) ? e.message : String(e)}`);
          });
        }
        break;

      // -----------------------------------------------------------------------------------------
      case 'blank':
      // -----------------------------------------------------------------------------------------

        window.open(contentPath, '_blank');
        break;

      // no default
    }
  };


  /**
   *
   */
  const handleClickOrKeyUpMenuNodeLink = () => {
    if (!menuNode.isDisabled) {
      if (menuNode.submenuNodeIds.length > 0) {
        setShowMenu(true);
      } else {
        handleClickMenuNodeEntry(menuNode);
      }
    }
  };


  /**
   * Handler for the synthetic React event "onClick" of the native main element of the menu item
   * link. Event propagation is stopped, because the header has a click event too.
   */
  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (event) => {
    event.stopPropagation();
    handleClickOrKeyUpMenuNodeLink();
  };


  /**
   * Handler for the synthetic React event "onKeyUp" of the native main element of the menu item
   * link. Event propagation is stopped, because the header has a click event too.
   */
  const handleKeyUp: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    if ((event.key === 'Enter') || (event.key === ' ')) {
      event.stopPropagation();
      handleClickOrKeyUpMenuNodeLink();
    }
  };


  /**
   * Handler for the callback prop "onClick" of the popup component "Menu".
   */
  const handleClickMenuEntry: NonNullable<React.ComponentProps<typeof Menu>['onClick']> = ({ menuItemId }) => {
    if (allMenuNodes[menuItemId]) {
      handleClickMenuNodeEntry(allMenuNodes[menuItemId]);
      setShowMenu(false);
    }
  };


  /**
   * Handler for the callback prop "onClose" of the popup component "Menu".
   */
  const handleHideMenu: NonNullable<React.ComponentProps<typeof Menu>['onClose']> = () => {
    setShowMenu(false);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const menuNodeLinkClasses = classNames(css.menuNode, {
    [css.disabled]: menuNode.isDisabled,
  });


  return (
    <>
      <span
        ref={menuNodeLinkRef}
        id={`viwgf_secondaryHeader_${menuNode.id}`}
        role="button"
        aria-disabled={menuNode.isDisabled}
        tabIndex={0}
        className={menuNodeLinkClasses}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
      >
        {!!icon && (
          <svg width={iconSizePx} height={iconSizePx} viewBox={viewbox}>
            <path d={icon} />
          </svg>
        )}
      </span>
      {showMenu
        ? (
          <Menu
            anchorElemRef={menuNodeLinkRef}
            entries={submenuEntries}
            onClick={handleClickMenuEntry}
            onClose={handleHideMenu}
          />
        )
        : null}
    </>
  );
  //                                                                                  </editor-fold>
};


MenuNode.displayName = 'MenuNode';


export { MenuNode };
