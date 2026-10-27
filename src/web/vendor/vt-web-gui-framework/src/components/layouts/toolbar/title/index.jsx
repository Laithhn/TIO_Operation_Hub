import PropTypes from 'prop-types';
import { memo } from 'react';

import Enums from 'assets/enums';
import bbCode from 'utils/bbCode';
import classNames from 'utils/classNames';

import css from './title.scss';


/**
 * Memoized React component of the title used in component Toolbar.
 */
const Title = memo(({
  darkTheme, title, titleType, subTitle, centerTitle,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isSubTitle = (
    (typeof subTitle === 'number')
    || ((typeof subTitle === 'string') && (subTitle !== ''))
  );


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

  const titleClasses = classNames(css.title, {
    [css.centerTitle]: centerTitle,
  });

  const titleTextClasses = classNames(css.titleText, {
    [css.titleTypeIsTitle]: (titleType === Enums.TextType.TITLE),
    [css.titleTypeIsLabel]: (titleType === Enums.TextType.LABEL),
    [css.typoDarkTheme]: darkTheme,
  });

  const subTitleTextClasses = classNames(css.subTitleText, {
    [css.typoDarkTheme]: darkTheme,
  });

  return (
    <div className={titleClasses}>
      <span className={titleTextClasses}>{title}</span>
      {isSubTitle && <span className={subTitleTextClasses}>{bbCode(subTitle)}</span>}
    </div>
  );
  //                                                                                  </editor-fold>
});

Title.displayName = 'Title';

Title.propTypes = {
  darkTheme: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  titleType: PropTypes.oneOf([Enums.TextType.HEADLINE, Enums.TextType.TITLE, Enums.TextType.LABEL]),
  subTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  centerTitle: PropTypes.bool,
};

Title.defaultProps = {
  darkTheme: false,
  title: '',
  titleType: Enums.TextType.HEADLINE,
  subTitle: '',
  centerTitle: false,
};

export default Title;
