import { useEffect, useState } from 'react';

import { ContentContext, type ContentContextData } from 'app/modules/content';
import * as cssDashboard from 'app/modules/content/dashboard.scss';
import { classNames } from 'utils/classNames';

import * as css from './contentScope.scss';
import type { ContentScopeProps } from './contentScope.types';


const contextScopePoviderValue: ContentContextData = {
  isScopeModwin: false,
  isScopeSecondSidebar: true,
  callerId: '',
  contentData: {},
  isContentRestored: false,
};


/**
 * React sub-component of the project specific content section of the app module "SecondSidebar".
 */
const ContentScope = ({ contentPath }: ContentScopeProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [contentComponent, setContentComponent] = useState<{ default: React.ComponentType } | null>(null);


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
    if (process.env['PATH_CONTENTS'] && contentPath) {
      import(/* webpackInclude: /content\.[jt]sx$/i */process.env['PATH_CONTENTS'] + contentPath).then((module: { default: React.ComponentType }) => {
        const displayName = module.default.displayName ?? '';

        if (!/Dashboard/i.test(displayName)) {
          throw new Error(`The root component of the content to be loaded has an invalid display name: "${displayName}". The display name must contain "Dashboard". Please set it in the root component of this content.`);
        }

        setContentComponent(module);
      }).catch((e: unknown) => {
        throw new Error(`VIWGF/Frame > Sidebars/SecondSidebar/ContentScope: trying to load sidebar content "${contentPath}" failed: ${(e instanceof Error) ? e.message : String(e)}`);
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
    <ContentContext.Provider value={contextScopePoviderValue}>
      <div className={classNames(css.contentScope, cssDashboard.dashboard)}>
        <contentComponent.default />
      </div>
    </ContentContext.Provider>
  );
  //                                                                                  </editor-fold>
};

ContentScope.displayName = 'ContentScope';


export { ContentScope };
