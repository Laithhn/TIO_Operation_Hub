import { useImperativeHandle, useRef } from 'react';

import { space } from 'assets/styles';
import { useStylingProps } from 'components/hooks/useStylingProps';
import { Spinner } from 'components/indicators/spinner';
import { Section } from 'components/layouts/section';
import { classNames } from 'utils/classNames';

import * as css from './image.scss';
import { type ImageProps, imageStylingProps } from './image.types';


/**
 * React component of the indicator component "Image" to display an image using the <img> element at
 * dashboard contents of VtWebGuiFramework.
 */
const Image = ({
  ref, id, src = '', alt = '', onClick, ...restProps
}: ImageProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const imageElemRef = useRef<HTMLDivElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { innerElemStyle, outerElemStyle } = useStylingProps(restProps, imageStylingProps);

  const isClickable = (typeof onClick === 'function');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    clientLeft: imageElemRef.current?.clientLeft,
    clientWidth: imageElemRef.current?.clientWidth,
    clientTop: imageElemRef.current?.clientTop,
    clientHeight: imageElemRef.current?.clientHeight,
    getBoundingClientRect: () => imageElemRef.current?.getBoundingClientRect(),
  }), []);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!src) {
    return (
      <Section {...restProps}>
        <Spinner placeSelf="center" type="bars" dim={space.large} />
      </Section>
    );
  }

  const imageClasses = classNames(css.image, {
    [css.clickable]: isClickable,
  });

  // Note that dividing the component into a relative positioned container and the absolute
  // positioned image is necessary to ensure that the image size does not affect the surrounding
  // grid lyaout.
  return (
    <div
      ref={imageElemRef}
      {...(id && { id })}
      className={classNames(css.contr, { [css.contactPane]: (restProps.boxShadow === 'contact') })}
      style={outerElemStyle}
    >
      <img
        className={imageClasses}
        style={innerElemStyle}
        src={src}
        alt={alt}
        {...(isClickable && { onClick: (event) => {
          onClick({ event });
        } })}
      />
    </div>
  );
  //                                                                                  </editor-fold>
};

Image.displayName = 'Image';


export { Image };
