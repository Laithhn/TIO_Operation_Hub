import PropTypes from 'prop-types';
import { memo } from 'react';

import defines from 'assets/defines';
import measureText from 'utils/measureText';

import css from './title.scss';


const fontSizeList = [defines.typo.fontSize.normal, defines.typo.fontSize.small, defines.typo.fontSize.xs];

// the maximum available width for the title (considering the border width of the sidebar)
const titleWidthMax = defines.layout.sidebars.firstSidebarWidth - (2 * defines.layout.mostLeftRightPadding) - 1;


/**
 * Memoized React component of the title field of the first sidebar.
 */
const Title = memo(({ title }) => {
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
        fontWeight: defines.typo.fontWeight.semibold,
        considerLineBreaks: true,
      },
    ) <= titleWidthMax
  )) ?? defines.typo.fontSize.xs;


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
});

Title.displayName = 'Title';

Title.propTypes = {
  title: PropTypes.string,
};

Title.defaultProps = {
  title: '',
};

export default Title;
