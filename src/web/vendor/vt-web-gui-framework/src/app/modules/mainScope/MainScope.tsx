import { NavigationType, useLocation, useNavigationType } from 'react-router';

import { Content, type ContentData, type ContentProps } from 'app/modules/content';
import { ErrorScreen } from 'app/modules/errorScreen';
import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { primaryMenuSlice } from 'store/menus/primaryMenu';
import { navigationSlice } from 'store/navigation';

import * as css from './mainScope.scss';
import { finishLoadingContent, startLoadingContent, unloadContent } from './mainScope.slice';


/**
 * React component of the app module "MainScope".
 */
const MainScope = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const location = useLocation();

  const menuNode = useSelector((state) => primaryMenuSlice.selectEnabledMenuNodeWithContentByUrlPath(state, location.pathname));
  const behaviorAtInvalidUrl = useSelector(primaryMenuSlice.selectBehaviorAtInvalidUrl);
  const addUrlEntry = useSelector((state) => navigationSlice.selectEnabledAdditionalUrlPathEntryByUrlPath(state, location.pathname));


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isContentRestored = (useNavigationType() === NavigationType.Pop);
  let showErrorScreen = false,
    callerId = '',
    contentPath = '',
    contentData: ContentData = {};

  // note: an existing additional URL path has always priority over the primary menu
  if (addUrlEntry) {
    callerId = addUrlEntry.path;
    ({ contentPath } = addUrlEntry);
    contentData = addUrlEntry.options;
  } else if (menuNode) {
    callerId = menuNode.id;
    ({ contentPath } = menuNode);
    contentData = menuNode.options;
  } else if (behaviorAtInvalidUrl === '_error') {
    showErrorScreen = true;
  } else if (!['_startpage', '_blank'].includes(behaviorAtInvalidUrl)) {
    callerId = location.pathname;
    contentPath = behaviorAtInvalidUrl;
    contentData = {};
  }

  // extend the content data as object with key-value-pairs from the query string of the given
  // location and with the optional state of the location object of react-router
  contentData = (location.search.match(/(?<grp0>[^?=&]+)(?<grp1>=(?<grp2>[^&]*))?/g) ?? []).reduce<ContentData>((acc, entry) => {
    const [key, value] = entry.split('=');

    return (
      key
      && ((key !== 'hash') || !location.hash)
      && (typeof value === 'string')
    )
      ? {
        ...acc,
        [key]: value,
      }
      : acc;
  }, { ...contentData, ...location.state as ContentData | undefined, ...(location.hash && { hash: location.hash }) });


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onStartLoading" of the app module "Content".
   */
  const handleStartLoading: NonNullable<ContentProps['onStartLoading']> = (id) => {
    dispatch(startLoadingContent(id));
  };


  /**
   * Handler for the callback prop "onFinishLoading" of the app module "Content".
   */
  const handleFinishLoading: NonNullable<ContentProps['onFinishLoading']> = (contentType) => {
    dispatch(finishLoadingContent(contentType));
  };


  /**
   * Handler for the callback prop "onDestruct" of the app module "Content".
   */
  const handleDestructContent: NonNullable<ContentProps['onDestruct']> = () => {
    dispatch(unloadContent());
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (!showErrorScreen && !contentPath) {
    return null;
  }


  return (
    <main className={css.mainScope}>
      {showErrorScreen
        ? (
          <ErrorScreen
            title="Page not found"
            message={`The requested URL "${location.pathname}" was not found on the server.`}
          />
        )
        : (
          <Content
            contentPath={contentPath}
            isScopeModwin={false}
            callerId={callerId}
            contentData={contentData}
            isContentRestored={isContentRestored}
            onStartLoading={handleStartLoading}
            onFinishLoading={handleFinishLoading}
            onDestruct={handleDestructContent}
          />
        )}
    </main>
  );
  //                                                                                  </editor-fold>
};

MainScope.displayName = 'MainScope';


export { MainScope };
