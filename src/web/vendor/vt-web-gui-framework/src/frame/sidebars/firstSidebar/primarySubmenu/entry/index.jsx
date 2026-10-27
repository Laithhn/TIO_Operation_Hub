import { Enumify } from 'enumify';
import PropTypes from 'prop-types';
import {
  memo, useRef, useState, useCallback, useEffect,
} from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import { selectors, hooks } from 'store';
import classNames from 'utils/classNames';

import firstSidebarDefines from '../../defines';
import css from './entry.scss';


/**
 * Enumeration for the lifecycle steps of the animation frame.
 */
class AnimationStep extends Enumify {
  static IS_CLOSED = new AnimationStep();
  static START_OPENING = new AnimationStep();
  static OPENING_1 = new AnimationStep();
  static OPENING_2 = new AnimationStep();
  static IS_OPEN = new AnimationStep();
  static START_CLOSING = new AnimationStep();
  static CLOSING_1 = new AnimationStep();
  static CLOSING_2 = new AnimationStep();
  static _ = this.closeEnum();
}


const levelOfEntries = 2;
const levelOfSubEntries = 3;
const iconDimPx = `${firstSidebarDefines.primarySubmenu.entry.iconDim}px`;


/**
 * Memoized React component of a primary submenu node (entry) in the sidebar. It must be ensured in
 * the parent component, that the given menu node is not hidden.
 */
const Entry = memo(({ menuNode, onSetHeight, onActive }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const {
    id, level, disabled, urlPath,
  } = menuNode;

  const { translateText } = hooks.useI18n();

  const submenuNodes = useSelector((state) => selectors.menus.primaryMenu.getVisibleSubmenuNodesById(state, id));
  const isActive = useSelector((state) => selectors.menus.primaryMenu.isMenuNodeActive(state, id));
  const isPartOfActiveMenuTree = useSelector((state) => selectors.menus.primaryMenu.isIdPartOfActiveMenuTree(state, id));

  const [animationState, setAnimationState] = useState({
    entryHeightPx: null,
    addPaddingBottom: false,
    renderSubEntries: false,
  });

  const entryRef = useRef();
  const subEntriesHeightsRef = useRef({});
  const animationDataRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { viewbox, getIconPath } = useIconsAsync();

  const isSubEntry = (level === levelOfSubEntries);
  const icon = (!isSubEntry && menuNode.icon) ? getIconPath(menuNode.icon) : '';
  const sign = (isSubEntry && menuNode.icon) ? menuNode.icon : '';
  const caption = translateText(menuNode.caption);
  const showSubEntries = !isSubEntry && ((submenuNodes ?? []).length > 0) && isPartOfActiveMenuTree;


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const animate = (timestamp) => {
    switch (animationDataRef.current.step) {
      // -------------------------------------------------------------------------------------------
      case AnimationStep.START_OPENING: {
      // -------------------------------------------------------------------------------------------

        // Set the height in the style object to the current one (instead of "auto") and go to the
        // next step.

        setAnimationState((prevState) => {
          const minHeightPx = `${entryRef.current.firstChild.clientHeight}px`;

          animationDataRef.current.minHeightPx = minHeightPx;
          animationDataRef.current.step = AnimationStep.OPENING_1;
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            entryHeightPx: minHeightPx,
            renderSubEntries: true,
          };
        });
        break;
      }

      // -------------------------------------------------------------------------------------------
      case AnimationStep.OPENING_1: {
      // -------------------------------------------------------------------------------------------

        // Step to set the height to the maximum one so the height-animation can start run to it.

        setAnimationState((prevState) => {
          let maxHeight = firstSidebarDefines.primarySubmenu.entry.paddingBottomIfOpen;

          for (let i = 0; i < entryRef.current.children.length; i++) {
            maxHeight += entryRef.current.children[i].clientHeight;
          }

          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.step = AnimationStep.OPENING_2;
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            entryHeightPx: `${maxHeight}px`,
            addPaddingBottom: true,
          };
        });
        break;
      }

      // -------------------------------------------------------------------------------------------
      case AnimationStep.OPENING_2:
      // -------------------------------------------------------------------------------------------

        // Wait until the animation is ready, than change the height of the element back to "auto"
        // and go to the final opening step.

        if ((timestamp - animationDataRef.current.startTimestampMs) > firstSidebarDefines.primarySubmenu.entry.heightAnimationTimeMs) {
          setAnimationState((prevState) => {
            animationDataRef.current.step = AnimationStep.IS_OPEN;

            return {
              ...prevState,
              entryHeightPx: null,
            };
          });
        } else {
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
        }
        break;

      // -------------------------------------------------------------------------------------------
      case AnimationStep.START_CLOSING:
      // -------------------------------------------------------------------------------------------

        // Step to set the height to the current one (instead of "auto") and go to the next step.

        setAnimationState((prevState) => {
          animationDataRef.current.step = AnimationStep.CLOSING_1;
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            entryHeightPx: `${entryRef.current.clientHeight}px`,
          };
        });
        break;

      // -------------------------------------------------------------------------------------------
      case AnimationStep.CLOSING_1:
      // -------------------------------------------------------------------------------------------

        // Step to set the height to the minimum value, stored in step "START_OPENING" so the
        // height-animation can start run to it.

        setAnimationState((prevState) => {
          animationDataRef.current.startTimestampMs = timestamp;
          animationDataRef.current.step = AnimationStep.CLOSING_2;
          animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);

          return {
            ...prevState,
            entryHeightPx: animationDataRef.current.minHeightPx,
            addPaddingBottom: false,
          };
        });
        break;

      // -------------------------------------------------------------------------------------------
      case AnimationStep.CLOSING_2:
      // -------------------------------------------------------------------------------------------

        // Wait until the sub entries have to be hided, than change the height of the element to
        // "auto" and go back to the final closing step.

        if ((timestamp - animationDataRef.current.startTimestampMs) > firstSidebarDefines.primarySubmenu.entry.heightAnimationTimeMs) {
          setAnimationState((prevState) => {
            animationDataRef.current.step = AnimationStep.IS_CLOSED;

            return {
              ...prevState,
              entryHeightPx: null,
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
   * Handler to store the height of a menu node of the own submenu, that is directly rendered below.
   */
  const handleSetHeight = useCallback((menuNodeId, menuNodeHeight) => {
    subEntriesHeightsRef.current[menuNodeId] = menuNodeHeight;
  }, []);


  /**
   * Handler to signalize, that one of the menu nodes of the own submenu (or anything inside it)
   * becomes active.
   */
  const handleActive = useCallback((menuNodeId, offset) => {
    let totalOffset = entryRef.current.firstChild.clientHeight + offset;

    for (let i = 0; i < (submenuNodes ?? []).length; i++) {
      if (submenuNodes[i].id === menuNodeId) {
        break;
      }
      totalOffset += (subEntriesHeightsRef.current[submenuNodes[i].id] ?? 0);
    }

    onActive(id, totalOffset);
  }, [id, onActive, submenuNodes]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    onSetHeight(id, entryRef.current.firstChild.clientHeight);
  }, [onSetHeight, id, caption]);


  useEffect(() => {
    if (isActive) {
      onActive(id, entryRef.current.firstChild.clientHeight / 2);
    }
  }, [onActive, isActive, id]);


  useEffect(() => {
    if (!animationDataRef.current) {
      animationDataRef.current = {
        minHeightPx: null,
        startTimestampMs: undefined,
        step: AnimationStep.IS_CLOSED,
        reqAnimFrame: undefined,
      };
    }

    if (
      showSubEntries
      && (
        (animationDataRef.current.step === AnimationStep.IS_CLOSED)
        || (animationDataRef.current.step.enumOrdinal >= AnimationStep.START_CLOSING.enumOrdinal)
      )
    ) {
      // start showing the submenus if IS_CLOSED, START_CLOSING, CLOSING_1 or CLOSING_2
      animationDataRef.current.step = AnimationStep.START_OPENING;
      animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
    } else if (
      !showSubEntries
      && (animationDataRef.current.step.enumOrdinal >= AnimationStep.START_OPENING.enumOrdinal)
      && (animationDataRef.current.step.enumOrdinal <= AnimationStep.IS_OPEN.enumOrdinal)
    ) {
      // start hiding the submenus if START_OPENING, OPENING_1, OPENING_2 or IS_OPEN
      animationDataRef.current.step = AnimationStep.START_CLOSING;
      animationDataRef.current.reqAnimFrame = requestAnimationFrame(animate);
    }
  });


  useEffect(() => () => {
    cancelAnimationFrame(animationDataRef.current.reqAnimFrame);
    animationDataRef.current = undefined;
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // only menu nodes with the levels for entries and sub entries are allowed in the first sidebar
  if ((level !== levelOfEntries) && (level !== levelOfSubEntries)) {
    return null;
  }

  const entryClasses = classNames(css.entry, {
    [css.addPaddingBottom]: animationState.addPaddingBottom,
  });

  const entryStyle = {
    height: animationState.entryHeightPx ?? 'auto',
  };

  const linkClasses = classNames(css.link, {
    [css.isSubEntry]: isSubEntry,
    [css.hasIcon]: icon,
    [css.hasSign]: sign,
    [css.active]: isPartOfActiveMenuTree,
    [css.disabled]: disabled,
  });


  const innerPart = (
    <>
      {icon && (
        <svg width={iconDimPx} height={iconDimPx} viewBox={viewbox}>
          <path d={icon} />
        </svg>
      )}
      {isSubEntry && <span className={css.line} />}
      {sign && <span className={css.sign}>{sign}</span>}
      <span className={css.caption}>{caption}</span>
    </>
  );


  return (
    <div
      ref={entryRef}
      {...((process.env.NODE_ENV === 'development') && { id: `primarySubmenu__entry__${menuNode.id}` })}
      className={entryClasses}
      style={entryStyle}
    >
      {disabled ? (
        <span className={linkClasses}>{innerPart}</span>
      ) : (
        <Link className={linkClasses} to={{ pathname: urlPath }}>{innerPart}</Link>
      )}
      {animationState.renderSubEntries && (submenuNodes ?? []).map((submenuNode) => (
        <Entry
          key={submenuNode.id}
          menuNode={submenuNode}
          onSetHeight={handleSetHeight}
          onActive={handleActive}
        />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
});

Entry.displayName = 'Entry';

Entry.propTypes = {
  menuNode: PropTypes.shape({
    id: PropTypes.string,
    caption: PropTypes.string,
    level: PropTypes.number,
    icon: PropTypes.string,
    disabled: PropTypes.bool,
    urlPath: PropTypes.string,
  }).isRequired,
  onSetHeight: PropTypes.func,
  onActive: PropTypes.func,
};

Entry.defaultProps = {
  onSetHeight() {},
  onActive() {},
};

export default Entry;
