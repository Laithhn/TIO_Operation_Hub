import {
  useCallback, useEffect, useRef, useState,
} from 'react';

import type { SizeMeasurerProps } from './sizeMeasurer.types';


/**
 * React component of the helper component "SizeMeasurer".
 */
const SizeMeasurer = ({
  className, style, disableWidth = false, disableHeight = false, children,
}: SizeMeasurerProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [clientWidth, setClientWidth] = useState<number | null>(null);
  const [clientHeight, setClientHeight] = useState<number | null>(null);

  const sizeMeasurerRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isInit = (disableWidth || !!clientWidth) && (disableHeight || !!clientHeight);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the custom event "domChange" of the document to read and set the
   * dimensions.
   *
   * It keeps its useCallback: an effect lists it in its dependencies, and
   * react-hooks/exhaustive-deps, which does not know the React Compiler, asks for a stable identity
   * there.
   */
  const handleContrResize = useCallback(() => {
    if (sizeMeasurerRef.current) {
      if (!disableWidth) {
        setClientWidth(sizeMeasurerRef.current.clientWidth);
      }

      if (!disableHeight) {
        setClientHeight(sizeMeasurerRef.current.clientHeight);
      }
    }
  }, [disableWidth, disableHeight]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    document.addEventListener('domChange', handleContrResize);
    handleContrResize();

    return () => {
      document.removeEventListener('domChange', handleContrResize);
    };
  }, [handleContrResize]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <div ref={sizeMeasurerRef} className={className} style={style}>
      {isInit && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        children({ clientWidth, clientHeight })
      )}
    </div>
  );
  //                                                                                  </editor-fold>
};

SizeMeasurer.displayName = 'SizeMeasurer';


export { SizeMeasurer };
