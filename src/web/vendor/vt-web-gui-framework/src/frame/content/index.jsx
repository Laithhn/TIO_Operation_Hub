import PropTypes from 'prop-types';
import {
  memo, forwardRef, useReducer, useRef, useEffect,
} from 'react';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import ContextScope from 'components/contexts/contextScope';
import Scrolling from 'components/helpers/scrolling';
import ErrorScreen from 'frame/errorScreen';
import classNames from 'utils/classNames';

import cssArticle from './article.scss';
import contentReducer, {
  initialState, actions as contentActions, selectors as contentSelectors,
} from './contentReducer';
import cssDashboard from './dashboard.scss';
import cssIframe from './iframe.scss';


/**
 * Memoized React component of the content container that loads and renders the content by a given
 * path.
 */
const Content = memo(forwardRef(({
  contentPath, isScopeModwin, callerId, contentData, isContentRestored, onStartLoading,
  onFinishLoading, onDestruct,
}, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [contentState, contentDispatch] = useReducer(contentReducer, initialState);
  const loadedContentPath = contentSelectors.getContentPath(contentState);
  const loadedContentType = contentSelectors.getContentType(contentState);
  const loadedContent = contentSelectors.getContent(contentState);
  const loadedContentError = contentSelectors.getContentError(contentState);
  const contextScopePoviderValue = contentSelectors.getContextScopePoviderValue(contentState);

  const prevsRef = useRef({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    isScopeModwin: loadedIsScopeModwin,
    callerId: loadedCallerId,
    isContentRestored: loadedIsContentRestored,
  } = contextScopePoviderValue;
  const fadeOut = (contentPath !== loadedContentPath) || (callerId !== loadedCallerId);


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

  // Effect to load the content asynchronously and dynamically.
  useEffect(() => {
    (async () => {
      if ((contentPath !== prevsRef.current.contentPath) || (callerId !== prevsRef.current.callerId)) {
        prevsRef.current.contentPath = contentPath;
        prevsRef.current.callerId = callerId;
        onStartLoading();

        /**
         * Function that returns a timeout promise that waits the minimum time to change a content.
         */
        const waitPromise = () => new Promise((resolve) => {
          if (loadedContentPath !== undefined) {
            setTimeout(resolve, defines.system.contentChangeFadeOutTimeMs);
          } else {
            resolve();
          }
        });


        /**
         * Async function that loads the content file and returns a promise with the content and
         * content type.
         */
        const loadPromise = async () => {
          if (/^https?:\/\//i.test(contentPath)) {
            return {
              contentType: Enums.ContentType.IFRAME,
              content: null,
            };
          }

          const module = (contentPath.startsWith('viwgf')
            ? await import('../../contents/' + contentPath[5].toLowerCase() + contentPath.substring(6) + '/content.jsx') // eslint-disable-line prefer-template
            : await import(process.env.PATH_CONTENTS + contentPath + '/content.jsx') // eslint-disable-line prefer-template
          );

          const displayName = module.default.displayName || '';

          if (/Dashboard/.test(displayName)) {
            return {
              contentType: Enums.ContentType.DASHBOARD,
              content: module,
            };
          }

          if (/Article/.test(displayName)) {
            return {
              contentType: Enums.ContentType.ARTICLE,
              content: module,
            };
          }

          throw new Error(`VIWGF/Frame > Content: the root component of the content to be loaded has an invalid display name: "${displayName}". The display name must contain "Dashboard" or "Article". Please set it in the root component of this content.`);
        };


        try {
          const [, { contentType, content }] = await Promise.all([waitPromise(), loadPromise()]);

          contentDispatch(contentActions.setContent(content, {
            contentPath, contentType, isScopeModwin, callerId, contentData, isContentRestored,
          }));
          onFinishLoading(contentType);
        } catch (error) {
          contentDispatch(contentActions.setError(error, {
            contentPath, isScopeModwin, callerId,
          }));
          onFinishLoading(Enums.ContentType.ERROR);
        }
      }
    })();
  }, [contentPath, isScopeModwin, callerId, contentData, isContentRestored, onStartLoading, onFinishLoading, loadedContentPath]);


  useEffect(() => () => {
    prevsRef.current = {};
    onDestruct();
  }, [onDestruct]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // Dashboard
  if (loadedContentType === Enums.ContentType.DASHBOARD) {
    const dashboardClasses = classNames(cssDashboard.dashboard, {
      [cssDashboard.inModwin]: loadedIsScopeModwin,
      [cssDashboard.fadeOut]: fadeOut,
    });

    return (
      <ContextScope.Provider value={contextScopePoviderValue}>
        <div className={dashboardClasses}>
          <loadedContent.default
            {...(loadedContent.default?.$$typeof === Symbol.for('react.forward_ref')) && { ref }}
          />
        </div>
      </ContextScope.Provider>
    );
  }

  // Article
  if (loadedContentType === Enums.ContentType.ARTICLE) {
    const articleClasses = classNames(cssArticle.article, {
      [cssArticle.fadeOut]: fadeOut,
    });

    return (
      <ContextScope.Provider value={contextScopePoviderValue}>
        <Scrolling
          className={articleClasses}
          {...(!loadedIsScopeModwin && { id: loadedCallerId })}
          vertical
          enableKeys
          restoreLastPosition={!loadedIsScopeModwin && loadedIsContentRestored}
          shaderColor={defines.layout.article.background}
        >
          <loadedContent.default
            {...(loadedContent.default?.$$typeof === Symbol.for('react.forward_ref')) && { ref }}
          />
        </Scrolling>
      </ContextScope.Provider>
    );
  }

  // Iframe
  if (loadedContentType === Enums.ContentType.IFRAME) {
    const iframeClasses = classNames(cssIframe.iframe, {
      [cssIframe.fadeOut]: fadeOut,
    });

    return (
      <iframe
        className={iframeClasses}
        title="VtWebGuiFramework - External Embedded Content"
        src={loadedContentPath}
      />
    );
  }

  // Error Screen
  if (loadedContentType === Enums.ContentType.ERROR) {
    return (
      <ErrorScreen
        title="Error loading Content"
        subTitle={`Sorry, an error occured while trying to load content "${contentPath}":`}
        message={loadedContentError.message}
        fileName={loadedContentError.fileName}
        lineNumber={loadedContentError.lineNumber}
        fadeOut={fadeOut}
      />
    );
  }

  return null;
  //                                                                                  </editor-fold>
}));

Content.displayName = 'Content';

Content.propTypes = {
  contentPath: PropTypes.string.isRequired,
  isScopeModwin: PropTypes.bool,
  callerId: PropTypes.string,
  contentData: PropTypes.object,
  isContentRestored: PropTypes.bool,
  onStartLoading: PropTypes.func,
  onFinishLoading: PropTypes.func,
  onDestruct: PropTypes.func,
};

Content.defaultProps = {
  isScopeModwin: false,
  callerId: '',
  contentData: {},
  isContentRestored: false,
  onStartLoading() {},
  onFinishLoading() {},
  onDestruct() {},
};

export default Content;
