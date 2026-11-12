import { useEffect, useRef, useState } from 'react';

import { layout } from 'assets/styles';
import { NavigationLink } from 'components/helpers/navigationLink';
import { useI18n } from 'components/hooks/useI18n';
import { useSelector } from 'components/hooks/useSelector';
import { type PrimaryMenuNode, primaryMenuSlice } from 'store/menus/primaryMenu';
import { classNames } from 'utils/classNames';

import { getIconPath, viewbox } from 'VtWebGuiIcons/src';

import * as css from './menuNode.scss';
import type { MenuNodeProps } from './menuNode.types';


const levelOfMenuNodes = 2;
const levelOfSubmenuNodes = 3;
const iconDimPx = `${layout.firstSidebar.menuIconDim}px`;


/**
 * React sub-component of a menu node in the menu of the app module "FirstSidebar".
 */
const MenuNode = ({ menuNode, onSetHeight, onActive }: MenuNodeProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    id, level, isDisabled, urlPath,
  } = menuNode;

  const { translateText } = useI18n();

  const submenuNodes = useSelector((state) => primaryMenuSlice.selectVisibleSubmenuNodes(state, id));
  const isActive = useSelector((state) => primaryMenuSlice.selectIsMenuNodeActive(state, id));
  const isPartOfActiveMenuTree = useSelector((state) => primaryMenuSlice.selectIsIdPartOfActiveMenuTree(state, id));

  const [animationState, setAnimationState] = useState<{
    menuNodeHeightPx: string | null; addPaddingBottom: boolean; renderSubEntries: boolean;
  }>({
    menuNodeHeightPx: null,
    addPaddingBottom: false,
    renderSubEntries: false,
  });

  const menuNodeRef = useRef<HTMLDivElement>(null);
  const submenuNodesHeightsRef = useRef<Record<PrimaryMenuNode['id'], number>>({});
  const animationDataRef = useRef<{
    reqAnimFrame: ReturnType<typeof requestAnimationFrame>;
    startTimestampMs: number;
    lifecycle: 'isClosed' | 'startOpening' | 'opening1' | 'opening2' | 'isOpen' | 'startClosing' | 'closing1' | 'closing2';
    minHeightPx: string;
  }>({
    reqAnimFrame: 0,
    startTimestampMs: 0,
    lifecycle: 'isClosed',
    minHeightPx: '',
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isSubmenuNode = (level === levelOfSubmenuNodes);
  const icon = (!isSubmenuNode && menuNode.icon) ? getIconPath(menuNode.icon) : '';
  const sign = (isSubmenuNode && menuNode.icon) ? menuNode.icon : '';
  const caption = translateText(menuNode.caption ?? '');
  // the framework's HTML ID of the node, carried by whichever element stands for its link
  const elemId = `viwgf_firstSidebar_${menuNode.id}`;
  const showSubEntries = !isSubmenuNode && ((submenuNodes ?? []).length > 0) && isPartOfActiveMenuTree;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const animate = (timestamp: DOMHighResTimeStamp) => {
    switch (animationDataRef.current.lifecycle) {
      // -------------------------------------------------------------------------------------------
      case 'startOpening': {
      // -------------------------------------------------------------------------------------------

        // Set the height in the style object to the current one (instead of "auto") and go to the
        // next step.

        setAnimationState((prevState) => {
          const minHeightPx = `${(menuNodeRef.current?.firstChild as Element | undefined)?.clientHeight ?? 0}px`;

          animationDataRef.current.minHeightPx = minHeightPx;
          animationDataRef.current.lifecycle = 'opening1';
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            menuNodeHeightPx: minHeightPx,
            renderSubEntries: true,
          };
        });
        break;
      }

      // -------------------------------------------------------------------------------------------
      case 'opening1': {
      // -------------------------------------------------------------------------------------------

        // Step to set the height to the maximum one so the height-animation can start run to it.

        setAnimationState((prevState) => {
          let maxHeight = layout.firstSidebar.menuNodeAddPaddingBottom;

          for (const child of menuNodeRef.current?.children ?? []) {
            maxHeight += child.clientHeight;
          }

          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.lifecycle = 'opening2';
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            menuNodeHeightPx: `${maxHeight}px`,
            addPaddingBottom: true,
          };
        });
        break;
      }

      // -------------------------------------------------------------------------------------------
      case 'opening2':
      // -------------------------------------------------------------------------------------------

        // Wait until the animation is ready, than change the height of the element back to "auto"
        // and go to the final opening step.

        if ((timestamp - animationDataRef.current.startTimestampMs) > layout.animationTime.contentFadeOutMs) {
          setAnimationState((prevState) => {
            animationDataRef.current.lifecycle = 'isOpen';

            return {
              ...prevState,
              menuNodeHeightPx: null,
            };
          });
        } else {
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case 'startClosing':
      // -------------------------------------------------------------------------------------------

        // Step to set the height to the current one (instead of "auto") and go to the next step.

        setAnimationState((prevState) => {
          animationDataRef.current.lifecycle = 'closing1';
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            menuNodeHeightPx: `${menuNodeRef.current?.clientHeight ?? 0}px`,
          };
        });
        break;

      // -------------------------------------------------------------------------------------------
      case 'closing1':
      // -------------------------------------------------------------------------------------------

        // Step to set the height to the minimum value, stored in step "START_OPENING" so the
        // height-animation can start run to it.

        setAnimationState((prevState) => {
          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.lifecycle = 'closing2';
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            menuNodeHeightPx: animationDataRef.current.minHeightPx,
            addPaddingBottom: false,
          };
        });
        break;

      // -------------------------------------------------------------------------------------------
      case 'closing2':
      // -------------------------------------------------------------------------------------------

        // Wait until the sub entries have to be hided, than change the height of the element to
        // "auto" and go back to the final closing step.

        if ((timestamp - animationDataRef.current.startTimestampMs) > layout.animationTime.contentFadeOutMs) {
          setAnimationState((prevState) => {
            animationDataRef.current.lifecycle = 'isClosed';

            return {
              ...prevState,
              menuNodeHeightPx: null,
              renderSubEntries: false,
            };
          });
        } else {
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
        }
        break;

      // no default
    }
  };


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onSetHeight" of the recursive usage of this component to store
   * the height of a menu node of the own submenu, that is directly rendered below.
   */
  const handleSetHeight: MenuNodeProps['onSetHeight'] = (menuNodeId, menuNodeHeight) => {
    submenuNodesHeightsRef.current[menuNodeId] = menuNodeHeight;
  };


  /**
   * Handler for the callback prop "onActive" of the recursive usage of this component to signalize,
   * that one of the menu nodes of the own submenu (or anything inside it) becomes active.
   */
  const handleActive: MenuNodeProps['onActive'] = (menuNodeId, offset) => {
    let totalOffset = ((menuNodeRef.current?.firstChild as Element | undefined)?.clientHeight ?? 0) + offset;

    for (let i = 0; i < (submenuNodes ?? []).length; i++) {
      if (submenuNodes![i]!.id === menuNodeId) {
        break;
      }
      totalOffset += (submenuNodesHeightsRef.current[submenuNodes![i]!.id] ?? 0);
    }

    onActive(id, totalOffset);
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    onSetHeight(id, (menuNodeRef.current?.firstChild as Element | undefined)?.clientHeight ?? 0);
  }, [onSetHeight, id, caption]);


  useEffect(() => {
    if (isActive) {
      onActive(id, ((menuNodeRef.current?.firstChild as Element | undefined)?.clientHeight ?? 0) / 2);
    }
  }, [onActive, isActive, id]);


  useEffect(() => {
    if (
      showSubEntries
      && ['isClosed', 'startClosing', 'closing1', 'closing2'].includes(animationDataRef.current.lifecycle)
    ) {
      // start showing the submenus
      animationDataRef.current.lifecycle = 'startOpening';
      animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
    } else if (
      !showSubEntries
      && ['startOpening', 'opening1', 'opening2', 'isOpen'].includes(animationDataRef.current.lifecycle)
    ) {
      // start hiding the submenus
      animationDataRef.current.lifecycle = 'startClosing';
      animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
    }
  });


  useEffect(() => () => {
    cancelAnimationFrame(animationDataRef.current.reqAnimFrame);

    animationDataRef.current = {
      reqAnimFrame: 0,
      startTimestampMs: 0,
      lifecycle: 'isClosed',
      minHeightPx: '',
    };
  }, [id]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // only menu nodes with the levels for entries and sub entries are allowed in the first sidebar
  if ((level !== levelOfMenuNodes) && (level !== levelOfSubmenuNodes)) {
    return null;
  }

  const menuNodeClasses = classNames(css.menuNode, {
    [css.addPaddingBottom]: animationState.addPaddingBottom,
  });

  const menuNodeStyle = {
    height: animationState.menuNodeHeightPx ?? 'auto',
  };

  const linkClasses = classNames(css.link, {
    [css.isSubmenuNode]: isSubmenuNode,
    [css.hasIcon]: icon,
    [css.hasSign]: sign,
    [css.active]: isActive,
    [css.disabled]: isDisabled,
  });


  const innerPart = (
    <>
      {icon && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <svg width={iconDimPx} height={iconDimPx} viewBox={viewbox}>
          <path d={icon} />
        </svg>
      )}
      {isSubmenuNode && <span className={css.line} />} {/* eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908 */}
      {sign && <span className={css.sign}>{sign}</span>} {/* eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908 */}
      <span className={css.caption}>{caption}</span>
    </>
  );


  return (
    <div
      ref={menuNodeRef}
      className={menuNodeClasses}
      style={menuNodeStyle}
    >
      {isDisabled
        ? (
          <span id={elemId} className={linkClasses}>{innerPart}</span>
        )
        : (
          <NavigationLink id={elemId} className={linkClasses} to={urlPath}>{innerPart}</NavigationLink>
        )}
      {animationState.renderSubEntries && (submenuNodes ?? []).map((submenuNode) => ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <MenuNode
          key={submenuNode.id}
          menuNode={submenuNode}
          onSetHeight={handleSetHeight}
          onActive={handleActive}
        />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
};

MenuNode.displayName = 'MenuNode';


export { MenuNode };
