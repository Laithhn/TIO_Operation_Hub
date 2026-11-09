import { classNames } from 'utils/classNames';

import { CheckBoxStatus } from '../checkBox.types';

import * as css from './icon.scss';
import type { IconProps } from './icon.types';


// The paths of the icons, taken from the SVG files in ../assets and minified. An icon is one shape
// in the color of its status, and everything that used to be drawn over it in the color of the
// surface - the inside of an empty box, the tick, the bar of the mixed value, the gap around the
// radio button's dot - is a hole in that shape: the control lets its background through instead of
// covering it with a plate, and the interaction veil reaches into the icon.
// A hole is a subpath wound against the one enclosing it, which both fill rules read as a hole - so
// no icon depends on a fill-rule being set. Nested holes alternate: the radio button's outer circle
// runs one way, the circle around the gap the other, the dot the first way again. Reversing an
// outline written as arcs means flipping every sweep flag; reversing one written as curves means
// reversing the whole point order, which is why the two shapes with curves keep their direction and
// the plate around them was turned instead.
// The tick box carries a corner radius of 4 on its 18 units, the proportion the large button takes
// from the controls map - 12 on a height of 50. It cannot come from that map: the corner is drawn
// inside the path, not by a border-radius on an element, and it scales with the glyph, so at the
// large size it renders as 6.7px rather than 4. Its inner corner is the outer radius less the
// stroke's 2, which keeps the frame equally thick around the bend.
const icons = {
  viewBox: '0 0 18 18',
  tickBox: {
    unchecked: 'M0 4v10a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4Zm4-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z',
    checked: 'M0 4v10a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4Zm3.485 5.849c-.321-.321-.318-.956 0-1.273.314-.315.954-.319 1.272 0l2.475 2.475 6.01-6.01c.32-.32.957-.317 1.273 0 .318.317.319.954 0 1.272L7.87 12.96c-.317.316-.953.32-1.273 0-1.128-1.155-2.135-2.128-3.111-3.111Z',
    mixed: 'M4 0h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Zm0 8a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2Z',
  },
  radioButton: {
    unchecked: 'M0 9a9 9 0 0 0 18 0 9 9 0 0 0-18 0Zm2 0a7 7 0 0 1 14 0 7 7 0 0 1-14 0Z',
    checked: 'M0 9a9 9 0 0 0 18 0 9 9 0 0 0-18 0Zm2 0a7 7 0 0 1 14 0 7 7 0 0 1-14 0Zm3 0a4 4 0 0 0 8 0 4 4 0 0 0-8 0Z',
  },
};


/**
 * React sub-component of the icon of the control component "CheckBox".
 */
const Icon = ({
  type, large, status, labelFirst, withoutLabel, iconStatus,
}: IconProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // Every glyph is square, so the icon size serves as its width and its height alike.
  const sizePx = `${large ? css.iconSizeLarge : css.iconSize}px`;
  // The mixed value belongs to the tick box alone; the radio button draws it as checked.
  const path = (type === 'tickBox')
    ? icons.tickBox[iconStatus]
    : icons.radioButton[(iconStatus === 'mixed') ? 'checked' : iconStatus];


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

  const checkBoxIconClasses = classNames(css.icon, {
    [css.large]: large,
    [css.disabled]: (status === CheckBoxStatus.DISABLED),
    [css.labelFirst]: labelFirst,
    [css.withoutLabel]: withoutLabel,
  });

  return (
    <span className={checkBoxIconClasses}>
      <svg width={sizePx} height={sizePx} viewBox={icons.viewBox}>
        <path d={path} />
      </svg>
      {/* The icon's baseline, and nothing else: this element carries a line box as tall as the
          control, and it is the only baseline-aligned item of the icon's inline grid - which is what
          makes that grid export a baseline at all. The check box aligns icon and label on it, so the
          label sits where a text beside the control expects it rather than at the icon's box edge.
          The stylesheet takes the element's own width back out again with a negative margin, so it
          occupies no space of its own. */}
      <span>&nbsp;</span>
    </span>
  );
  //                                                                                  </editor-fold>
};

Icon.displayName = 'Icon';


export { Icon };
