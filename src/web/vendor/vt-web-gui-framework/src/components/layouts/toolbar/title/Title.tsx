import { bbCode } from 'utils/bbCode';
import { classNames } from 'utils/classNames';
import { isNonEmptyStringOrNumber } from 'utils/type';

import * as css from './title.scss';
import type { TitleProps } from './title.types';


/**
 * React sub-component of the title used in the layout component "Toolbar".
 */
const Title = ({
  title, titleType, subTitle, centerTitle,
}: TitleProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


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
    [css.titleTypeIsTitle]: (titleType === 'title'),
    [css.titleTypeIsLabel]: (titleType === 'label'),
  });

  const subTitleTextClasses = classNames(css.subTitleText, {
  });

  return (
    <div className={titleClasses}>
      <span className={titleTextClasses}>{title}</span>
      {isNonEmptyStringOrNumber(subTitle) && <span className={subTitleTextClasses}>{bbCode(subTitle)}</span>}
    </div>
  );
  //                                                                                  </editor-fold>
};

Title.displayName = 'Title';


export { Title };
