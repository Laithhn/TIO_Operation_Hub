import { useEffect, useRef } from 'react';

import { systemSettings } from 'assets/defines';
import { ResizeHandle } from 'components/helpers/resizeHandle';
import { useDispatch } from 'components/hooks/useDispatch';
import { useDrag } from 'components/hooks/useDrag';
import { useSelector } from 'components/hooks/useSelector';
import { StorageItf, StorageType } from 'interfaces/storageItf';
import { addListener } from 'store';
import { i18nSlice } from 'store/i18n';

import { ContentScope } from './contentScope/ContentScope';
import { MinimizeButton } from './minimizeButton/MinimizeButton';
import * as css from './secondSidebar.scss';
import {
  init, selectContentPath, selectIsMinimizable, selectIsMinimized, selectIsResizable,
  selectStorageType, selectWidth, setWidth,
} from './secondSidebar.slice';
import type { SecondSidebarProps } from './secondSidebar.types';


/**
 * React component of the app module "SecondSidebar".
 */
const SecondSidebar = ({ onChange }: SecondSidebarProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isRtl = useSelector(i18nSlice.selectIsCurrentLanguageRtl);
  const isReady = useSelector(i18nSlice.selectIsReady);
  const width = useSelector(selectWidth);
  const isMinimizable = useSelector(selectIsMinimizable);
  const isMinimized = useSelector(selectIsMinimized);
  const isResizable = useSelector(selectIsResizable);
  const storageType = useSelector(selectStorageType);
  const contentPath = useSelector(selectContentPath);

  const isInitRef = useRef(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { dragProps: { onPointerDown: handlePointerDown } } = useDrag<HTMLDivElement>({
    rangeX: isRtl
      ? [0, (document.documentElement.clientWidth / 2)]
      : [(document.documentElement.clientWidth / 2), document.documentElement.clientWidth],
    onDrag: ({ diffX }) => {
      dispatch(setWidth(
        isRtl ? width + diffX : width - diffX,
      ));
    },
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (!isInitRef.current) {
      if (storageType === StorageType.internal) {
        dispatch(init({}));
      } else {
        // create a storage connection
        const storage = new StorageItf<{ width: number; isMinimized: boolean }>(systemSettings.storage.reservedKeys['secondSidebar']!, {
          hasSubValues: true,
          storageType,
          debounce: 3000,
        });

        // initialize the storage with the initial data from the configuration as default values
        void storage.init({ width, isMinimized }).then((storedData) => {
          dispatch(init(storedData));
        });

        // add a Redux listener for the most actions of the second sidebar to write changes of the
        // width and / or the value of the minimized flag into the storage
        dispatch(addListener({
          predicate: ({ type }, currentState, previousState) => (
            type.startsWith('VIWGF/secondSidebar/')
            && !!currentState.secondSidebar
            && (
              (currentState.secondSidebar.width !== previousState.secondSidebar?.width)
              || (currentState.secondSidebar.isMinimized !== previousState.secondSidebar.isMinimized)
            )
          ),
          effect: (_, listenerApi) => {
            const nextState = listenerApi.getState().secondSidebar;

            if (nextState) {
              storage.writeValue({ width: nextState.width, isMinimized: nextState.isMinimized });
            }
          },
        }));
      }

      isInitRef.current = true;
    }
  }, [width, isMinimized, storageType, dispatch]);


  useEffect(() => {
    if (isReady) {
      onChange({ width, isMinimized });
    }
  }, [onChange, isReady, width, isMinimized]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!isReady) {
    return null;
  }


  return (
    <div
      className={css.secondSidebar}
      style={{ width: `${width}px` }}
    >
      <ContentScope contentPath={contentPath} />
      {isResizable && !isMinimized && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <ResizeHandle placement={isRtl ? 'right' : 'left'} onPointerDown={handlePointerDown} />
      )}
      {isMinimizable && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <MinimizeButton isRtl={isRtl} isMinimized={isMinimized} />
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

SecondSidebar.displayName = 'SecondSidebar';


export { SecondSidebar };
