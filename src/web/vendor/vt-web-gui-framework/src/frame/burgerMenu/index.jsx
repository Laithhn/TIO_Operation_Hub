import {
  useState, useRef, useCallback, useEffect,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import useFadeInOut from 'components/hooks/useFadeInOut';
import { actions, selectors } from 'store';
import classNames from 'utils/classNames';

import Layer from './layer';
import css from './burgerMenu.scss';
import burgerMenuDefines from './defines';


const defaultMenuLayer = { id: null, state: Enums.Visibility.SHOW };


/**
 * React component of the Hamburger Menu, that contains the primary and the secondary menu.
 */
const BurgerMenu = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const show = useSelector(selectors.menus.common.isMenuPopupVisible);
  const activeMenuNode = useSelector(selectors.menus.primaryMenu.getActiveMenuNode);

  const [menuLayers, setMenuLayers] = useState([defaultMenuLayer]);

  const burgerMenuRef = useRef();
  const reqAnimFrameRef = useRef();
  const prevsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  /**
   *
   */
  const animate = useCallback((timestamp, nextId, dir) => {
    setMenuLayers((prevLayers) => {
      let nextLayers = [],
        breakLoop = false,
        setLayers = false,
        recall = false;

      // -------------------------------------------------------------------------------------------
      // At first, check and clean the current layers stack: switch the states to the next ones,
      // especially after fade in / out timeouts. Ensure that there are no layers below the top one
      // whose state is "SHOW". Layers, that have been completely faded out are deleted.
      // -------------------------------------------------------------------------------------------

      nextLayers = prevLayers.toReversed().reduce((acc, layer) => {
        if (!breakLoop) {
          switch (layer.state) {
            case Enums.Visibility.READY_TO_FADE_IN:
              setLayers = true;
              recall = true;
              return [{ ...layer, state: Enums.Visibility.FADE_IN }, ...acc];

            case Enums.Visibility.FADE_IN:
              if (timestamp > (layer.startTimestampMs + burgerMenuDefines.showHideAnimationTimeMs)) {
                breakLoop = true;
                setLayers = true;
                return [{ ...layer, state: Enums.Visibility.SHOW }, ...acc];
              }
              recall = true;
              return [layer, ...acc];

            case Enums.Visibility.FADE_OUT:
              if (timestamp > (layer.startTimestampMs + burgerMenuDefines.showHideAnimationTimeMs)) {
                setLayers = true;
                return acc;
              }
              recall = true;
              return [layer, ...acc];

            case Enums.Visibility.SHOW:
              breakLoop = true;
              return [layer, ...acc];

            // no default
          }
        }

        return acc;
      }, []);

      // The index of a given ID inside the new layers stack. If not found or if there is no ID, -1
      // is returned.
      const idxOfIdInStack = nextLayers.findIndex(({ id }) => (id === nextId));

      // -------------------------------------------------------------------------------------------
      if (dir === 'forward') { // add a new layer of a forward movement
      // -------------------------------------------------------------------------------------------

        if (idxOfIdInStack >= 0) {
          if (nextLayers[idxOfIdInStack].state === Enums.Visibility.FADE_OUT) {
            setLayers = true;
            nextLayers = [...nextLayers];
            nextLayers[idxOfIdInStack] = {
              ...nextLayers[idxOfIdInStack],
              state: Enums.Visibility.FADE_IN,
              startTimestampMs: (timestamp * 2) - nextLayers[idxOfIdInStack].startTimestampMs - burgerMenuDefines.showHideAnimationTimeMs,
            };
          }
        } else {
          setLayers = true;
          recall = true;
          nextLayers = [
            ...nextLayers,
            { id: nextId, state: Enums.Visibility.READY_TO_FADE_IN, startTimestampMs: timestamp },
          ];
        }

      // -------------------------------------------------------------------------------------------
      } else if (dir === 'back') { // add a new layer of a backward movement
      // -------------------------------------------------------------------------------------------

        nextLayers = nextLayers.map((layer, idx) => {
          if ((idx > idxOfIdInStack) && (layer.state !== Enums.Visibility.FADE_OUT)) {
            setLayers = true;
            recall = true;
            return {
              ...layer,
              state: Enums.Visibility.FADE_OUT,
              startTimestampMs: (layer.state === Enums.Visibility.SHOW)
                ? timestamp
                : (timestamp * 2) - layer.startTimestampMs - burgerMenuDefines.showHideAnimationTimeMs,
            };
          }

          return layer;
        });

        if (idxOfIdInStack < 0) {
          setLayers = true;
          nextLayers = [
            { id: nextId, state: Enums.Visibility.SHOW },
            ...nextLayers,
          ];
        }
      }


      if (recall) {
        reqAnimFrameRef.current = requestAnimationFrame(animate);
      }

      return setLayers ? nextLayers : prevLayers;
    });
  }, []);


  /**
   *
   */
  const hideBurgerMenu = useCallback(() => {
    dispatch(actions.menus.common.hideMenuPopup());
  }, [dispatch]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized handler for click on a link to switch the layers or to close the hamburger menu.
   */
  const handleNavTo = useCallback((id, options) => {
    if (options && options.hasContent && !options.hasSubmenuNodes) {
      hideBurgerMenu();
    } else {
      cancelAnimationFrame(reqAnimFrameRef.current);
      reqAnimFrameRef.current = requestAnimationFrame((t) => animate(t, id, options ? 'forward' : 'back'));
    }
  }, [animate, hideBurgerMenu]);


  /**
   * Memoized handler for native event "pointerdown" on the window element. Hide the hamburger menu
   * if the target of the event is inside the root container.
   */
  const handleWindowPointerDown = useCallback((event) => {
    if (
      burgerMenuRef.current
      && !burgerMenuRef.current.contains(event.target)
      && document.getElementById(process.env.ELEM_ID_ROOT).contains(event.target)
    ) {
      event.preventDefault(); // otherwise text selection works
      hideBurgerMenu();
    }
  }, [hideBurgerMenu]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  const { visibilityState } = useFadeInOut(show, {
    fadeInTimeMs: defines.layout.defaultAnimationTimeMs,
    fadeOutTimeMs: defines.layout.defaultAnimationTimeMs,
  });


  // If the visibility changes from hide to show: set the main menu node of navigation to the parent
  // menu node of the active primary menu node.
  useEffect(() => {
    if (show && !prevsRef.current.show) {
      setMenuLayers([(activeMenuNode && (activeMenuNode.level >= 2))
        ? {
          id: activeMenuNode.menuNodeTree[activeMenuNode.menuNodeTree.length - 2],
          state: Enums.Visibility.SHOW,
        } : defaultMenuLayer]);
    }

    prevsRef.current.show = show;
  }, [show, activeMenuNode]);


  useEffect(() => {
    if (show) {
      window.addEventListener('pointerdown', handleWindowPointerDown);

      return () => {
        window.removeEventListener('pointerdown', handleWindowPointerDown);
      };
    }

    return undefined;
  }, [show, handleWindowPointerDown]);


  useEffect(() => () => {
    cancelAnimationFrame(reqAnimFrameRef.current);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (visibilityState === Enums.Visibility.HIDE) {
    return null;
  }

  const burgerMenuClasses = classNames(css.burgerMenu, {
    [css.show]: (visibilityState === Enums.Visibility.FADE_IN) || (visibilityState === Enums.Visibility.SHOW),
  });

  return (
    <div ref={burgerMenuRef} className={burgerMenuClasses}>
      {menuLayers.map(({ id, state }) => (
        <Layer
          key={id ?? '__main_menu__'}
          menuNodeId={id}
          show={(state === Enums.Visibility.FADE_IN) || (state === Enums.Visibility.SHOW)}
          onClickLink={handleNavTo}
        />
      ))}
    </div>
  );
  //                                                                                  </editor-fold>
};

BurgerMenu.displayName = 'BurgerMenu';

export default BurgerMenu;
