import PropTypes from 'prop-types';
import { memo, useEffect, useState } from 'react';

import ContextScope from 'components/contexts/contextScope';
import classNames from 'utils/classNames';

import cssDashboard from '../../../content/dashboard.scss';
import css from './contentScope.scss';


const contextScopePoviderValue = {
  isScopeModwin: false,
  isScopeSecondSidebar: true,
  callerId: '',
  contentData: {},
  isContentRestored: false,
};


/**
 * Memoized React component of the project specific content section in the first or second sidebar.
 */
const ContentScope = memo(({ contentPath }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [contentComponent, setContentComponent] = useState(null);


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

  useEffect(() => {
    if (contentPath) {
      import(process.env.PATH_CONTENTS + contentPath + '/content.jsx').then((module) => { // eslint-disable-line prefer-template
        setContentComponent(module);
      }).catch((e) => {
        throw new Error(`VIWGF/Frame > Sidebars/SecondSidebar/ContentScope: trying to load sidebar content "${contentPath}" failed: ${e.message}`);
      });
    }
  }, [contentPath]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!contentComponent) {
    return null;
  }

  return (
    <ContextScope.Provider value={contextScopePoviderValue}>
      <div className={classNames(css.contentScope, cssDashboard.dashboard)}>
        <contentComponent.default />
      </div>
    </ContextScope.Provider>
  );
  //                                                                                  </editor-fold>
});

ContentScope.displayName = 'ContentScope';

ContentScope.propTypes = {
  contentPath: PropTypes.string,
};

ContentScope.defaultProps = {
  contentPath: '',
};

export default ContentScope;
