import PropTypes from 'prop-types';
import { memo, useMemo } from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import Spinner, { SpinnerType } from 'components/helpers/spinner';
import useStylingProps from 'components/hooks/useStylingProps';
import Section from 'components/layouts/section';
import classNames from 'utils/classNames';

import css from './image.scss';
import stylingProps from './stylingProps';


/**
 * Memoized React component to display an image using the <img> element at dashboard contents of
 * VtWebGuiFramework.
 */
const Image = memo(({
  id, src, alt, onClick, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { innerElemStyle, outerElemStyle } = useStylingProps(restProps, stylingProps);

  const isClickable = (typeof onClick === 'function');

  // Derive the style of the inner img element, if it needs border radius. This is the case, if
  // object-fit is "fill" or "cover" and the outer element has border radius and no padding at the
  // corner.
  const imageStyle = useMemo(() => {
    if ((innerElemStyle.objectFit === 'fill') || (innerElemStyle.objectFit === 'cover')) {
      const borderRadius = (outerElemStyle.borderRadius ?? '').split(' ');

      if (borderRadius.length === 4) {
        const padding = (innerElemStyle.padding ?? '').split(' ');
        const noPadding = (padding.length !== 4);
        const borderRadiusValuePx = `${defines.layout.components.borderRadius}px`;

        return {
          ...innerElemStyle,
          borderRadius: borderRadius.map((radius, idx) => {
            if (
              (radius === borderRadiusValuePx)
              && (
                noPadding
                || ((idx === 0) && (padding[0] === '0') && (padding[3] === '0'))
                || ((idx === 1) && (padding[0] === '0') && (padding[1] === '0'))
                || ((idx === 2) && (padding[1] === '0') && (padding[2] === '0'))
                || ((idx === 3) && (padding[2] === '0') && (padding[3] === '0'))
              )
            ) {
              return radius;
            }

            return 0;
          }).join(' '),
        };
      }
    }

    return innerElemStyle;
  }, [innerElemStyle, outerElemStyle]);


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

  if (!src) {
    return (
      <Section {...restProps}>
        <Spinner
          placeSelf={Enums.PlaceSelfItems.CENTER}
          type={SpinnerType.BARS}
          dim={defines.space.medium}
        />
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
    <div className={css.contr} style={outerElemStyle}>
      <img
        className={imageClasses}
        style={imageStyle}
        src={src}
        alt={alt}
        {...(isClickable && { onClick: (event) => onClick(id, event) })}
      />
    </div>
  );
  //                                                                                  </editor-fold>
});

Image.displayName = 'Image';

Image.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  elemStyle: PropTypes.object,
  src: PropTypes.string,
  alt: PropTypes.string,
  onClick: PropTypes.func,
};

Image.defaultProps = {
  id: '',
  elemStyle: {},
  src: '',
  alt: '',
  onClick: null,
};

export default Image;
