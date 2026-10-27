import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { selectors } from 'store';
import classNames from 'utils/classNames';

import cssDashboard from '../content/dashboard.scss';
import css from './footer.scss';


/**
 *
 */
const Footer = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const contentPath = useSelector(selectors.footer.getContentPath);

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
        throw new Error(`VIWGF/Frame > Footer: trying to load footer content "${contentPath}" failed: ${e.message}`);
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
    <div className={classNames(css.footer, cssDashboard.dashboard)}>
      <contentComponent.default />
    </div>
  );
  //                                                                                  </editor-fold>
};

Footer.displayName = 'Footer';

export default Footer;
