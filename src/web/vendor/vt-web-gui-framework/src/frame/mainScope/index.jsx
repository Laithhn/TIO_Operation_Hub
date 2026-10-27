import { memo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigationType } from 'react-router-dom';

import Content from 'frame/content';
import ErrorScreen from 'frame/errorScreen';
import { actions, selectors } from 'store';

import css from './mainScope.scss';


/**
 * Memoized React component of the main scope.
 */
const MainScope = memo(() => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const location = useLocation();

  const menuNode = useSelector((state) => selectors.menus.primaryMenu.getEnabledMenuNodeWithContentByUrlPath(state, location.pathname));
  const behaviorAtInvalidUrl = useSelector(selectors.menus.primaryMenu.getBehaviorAtInvalidUrl);
  const addUrlEntry = useSelector((state) => selectors.addUrlPathes.getEnabledEntryByUrlPath(state, location.pathname));
  const loadedContentType = useSelector(selectors.mainScope.getContentType);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isContentRestored = (useNavigationType() === 'POP');
  const { backgroundColor } = loadedContentType;
  let showErrorScreen = false,
    callerId, contentPath, contentData;

  // note: an existing additional URL path has always priority over the primary menu
  if (addUrlEntry) {
    callerId = addUrlEntry.path;
    contentPath = addUrlEntry.contentPath;
    contentData = addUrlEntry.options;
  } else if (menuNode) {
    callerId = menuNode.id;
    contentPath = menuNode.contentPath;
    contentData = menuNode.options;
  } else if (behaviorAtInvalidUrl === '_error') {
    showErrorScreen = true;
  } else if (!['_startpage', '_blank'].includes(behaviorAtInvalidUrl)) {
    callerId = location.pathname;
    contentPath = behaviorAtInvalidUrl;
    contentData = {};
  }

  // extend the content data as object with key-value-pairs from the query string of the given
  // location
  contentData = (location.search.match(/([^?=&]+)(=([^&]*))?/g) ?? []).reduce((acc, entry) => {
    const [key, value] = entry.split('=');

    return (
      (key !== '')
      && ((key !== 'hash') || !location.hash)
      && (typeof value === 'string')
    )
      ? {
        ...acc,
        [key]: value,
      } : acc;
  }, { ...contentData, ...(location.hash && { hash: location.hash }) });


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
   *
   */
  const handleStartLoading = useCallback(() => {
    dispatch(actions.mainScope.startLoadingContent(callerId));
  }, [callerId, dispatch]);


  /**
   *
   */
  const handleFinishLoading = useCallback((contentType) => {
    dispatch(actions.mainScope.finishLoadingContent(contentType));
  }, [dispatch]);


  /**
   *
   */
  const handleDestructContent = useCallback(() => {
    dispatch(actions.mainScope.unloadContent());
  }, [dispatch]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const mainScopeStyle = {
    background: backgroundColor,
  };

  return (
    <main className={css.mainScope} style={mainScopeStyle}>
      {showErrorScreen ? (
        <ErrorScreen
          title="Page not found"
          message={`The requested URL "${location.pathname}" was not found on the server.`}
        />
      ) : (contentPath && (
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
      ))}
    </main>
  );
  //                                                                                  </editor-fold>
});

MainScope.displayName = 'MainScope';

export default MainScope;
