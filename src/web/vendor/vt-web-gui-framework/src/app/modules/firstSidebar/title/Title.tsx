import { layout, typo } from 'assets/styles';
import { measureText } from 'utils/measureText';

import * as css from './title.scss';
import type { TitleProps } from './title.types';


const fontSizeList = [typo.fontSize.normal, typo.fontSize.small, typo.fontSize.xs];

// the maximum available width for the title (considering the border width of the sidebar)
const titleWidthMax = layout.firstSidebar.width - (2 * layout.mostLeftRightPadding) - 1;


/**
 * React sub-component of the title field of the app module "FirstSidebar".
 */
const Title = ({ title }: TitleProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const fontSize = fontSizeList.find((size) => (
    measureText(
      title,
      {
        fontSize: size,
        fontWeight: typo.fontWeight.semibold,
        considerLineBreaks: true,
      },
    ) <= titleWidthMax
  )) ?? typo.fontSize.xs;


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

  const titleStyle = {
    fontSize,
  };

  return (
    <div className={css.title} style={titleStyle}>
      <p>{title}</p>
    </div>
  );
  //                                                                                  </editor-fold>
};

Title.displayName = 'Title';


export { Title };
