import { useRef, useState } from 'react';

import { useInteractions } from 'components/hooks/useInteractions';
import { classNames } from 'utils/classNames';

import * as css from './previewImage.scss';
import type { PreviewImageProps } from './previewImage.types';


/**
 * React sub-component "PreviewImage" of the popup component "ImageViewer": one thumbnail of the
 * preview strip, which lifts and outlines itself while it stands for the shown image, and takes a
 * pointer as well as the keyboard to become that one.
 */
const PreviewImage = ({
  id, src = '', isSelected = false, onReportWidth, onClick,
}: PreviewImageProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [isLoaded, setIsLoaded] = useState(false);

  const previewImageElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  const { interactionProps } = useInteractions<HTMLSpanElement>({
    enablePointer: true,
    enableKeyboard: true,
    // The strip is scrolled by touch, and a thumbnail that swallowed the touch over its own area
    // would leave the strip scrollable in the gaps alone.
    enableTouchPropagation: true,
    tabIndex: 0,
    onClick: () => {
      onClick?.({ id });
    },
    onPointerUp: (event) => {
      // The event stops here: a click meant for a thumbnail is not one meant for the image, and
      // "useDrag" of the image listens for "pointerup" on the window.
      event.stopPropagation();
    },
  });


  /**
   * Handler for the React event "onLoad" of the image: its width is only known once it is there,
   * and the strip needs every width to place the selected thumbnail in its middle.
   */
  const handleImageLoaded = () => {
    setIsLoaded(true);

    if (previewImageElemRef.current) {
      onReportWidth?.({ id, width: previewImageElemRef.current.offsetWidth });
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const previewImageClasses = classNames(css.previewImage, {
    // The mark waits for the image: an outline around a thumbnail that is not there yet would sit
    // around nothing.
    [css.selected]: isLoaded && isSelected,
  });

  return (
    <span
      ref={previewImageElemRef}
      role="button"
      // Which thumbnail stands for the shown image is what the lift and the light rim say to the
      // eye, and this is the same statement for a screen reader.
      aria-current={isSelected}
      className={previewImageClasses}
      {...interactionProps}
    >
      <img alt={id} src={src} onLoad={handleImageLoaded} />
    </span>
  );
  //                                                                                  </editor-fold>
};

PreviewImage.displayName = 'PreviewImage';


export { PreviewImage };
