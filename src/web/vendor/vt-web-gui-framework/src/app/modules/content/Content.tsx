import { useEffect, useReducer, useRef } from 'react';

import { ErrorScreen } from 'app/modules/errorScreen';
import { layout } from 'assets/styles';
import { Scrolling } from 'components/helpers/scrolling';
import { classNames } from 'utils/classNames';

import * as cssArticle from './article.scss';
import { ContentContext } from './content.context';
import {
  contentReducer, initialState, selectCallerId, selectContent, selectContentError,
  selectContentPath, selectContentType, selectContextProviderValue, selectIsContentRestored,
  selectIsScopeModwin, setContent, setContentError,
} from './content.reducer';
import type { ContentProps, ContentReducerState } from './content.types';
import * as cssDashboard from './dashboard.scss';
import * as cssIframe from './iframe.scss';


/**
 * React component of the app module "Content" to load and render a content of a given path into a
 * content container.
 */
const Content = ({
  ref, contentPath, isScopeModwin = false, callerId = '', contentData = null,
  isContentRestored = false, onStartLoading, onFinishLoading, onDestruct,
}: ContentProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [contentState, contentDispatch] = useReducer(contentReducer, initialState);
  const loadedContentPath = selectContentPath(contentState);
  const loadedContentType = selectContentType(contentState);
  const loadedIsScopeModwin = selectIsScopeModwin(contentState);
  const loadedCallerId = selectCallerId(contentState);
  const loadedContent = selectContent(contentState);
  const loadedIsContentRestored = selectIsContentRestored(contentState);
  const loadedContentError = selectContentError(contentState);
  const contextProviderValue = selectContextProviderValue(contentState);

  const prevsRef = useRef<{
    contentPath?: typeof contentPath; callerId?: typeof callerId;
  }>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const fadeOut = (contentPath !== loadedContentPath) || (callerId !== loadedCallerId);

  const hash = (contentData?.['hash'] as string | undefined);


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
    void (async () => {
      if ((contentPath !== prevsRef.current.contentPath) || (callerId !== prevsRef.current.callerId)) {
        prevsRef.current.contentPath = contentPath;
        prevsRef.current.callerId = callerId;
        onStartLoading?.(callerId);


        /**
         * Function that returns a timeout promise that waits the minimum time to change a content.
         */
        const waitPromise = () => new Promise<void>((resolve) => {
          if (!loadedContentPath) {
            setTimeout(resolve, layout.animationTime.contentFadeOutMs);
          } else {
            resolve();
          }
        });


        /**
         * Async function to load the content file and return a promise with the content and
         * determined content type.
         */
        const loadPromise = async (): Promise<Pick<ContentReducerState, 'contentType' | 'content'>> => {
          if (/^https?:\/\//i.test(contentPath)) {
            return {
              contentType: 'iframe',
              content: null,
            };
          }

          let module: { default: React.ComponentType };

          if (/^viwgf.+/i.test(contentPath)) {
            module = await import('../' + contentPath[5]!.toLowerCase() + contentPath.substring(6) + '/content.tsx') as { default: React.ComponentType }; // eslint-disable-line prefer-template
          } else if (process.env['PATH_CONTENTS']) {
            module = await import(/* webpackInclude: /content\.[jt]sx$/i */process.env['PATH_CONTENTS'] + contentPath) as { default: React.ComponentType };
          } else {
            throw new Error(`The content file "${contentPath}" can't be loaded from the content folder, because the environment variable "PATH_CONTENTS" doesn't exist.`);
          }

          const displayName = module.default.displayName ?? '';

          if (/Dashboard/i.test(displayName)) {
            return {
              contentType: 'dashboard',
              content: module,
            };
          }

          if (/Article/i.test(displayName)) {
            return {
              contentType: 'article',
              content: module,
            };
          }

          throw new Error(`The root component of the content to be loaded has an invalid display name: "${displayName}". The display name must contain "Dashboard" or "Article". Please set it in the root component of this content.`);
        };


        try {
          const [, { contentType, content }] = await Promise.all([waitPromise(), loadPromise()]);

          contentDispatch(setContent(content, {
            contentPath, contentType, isScopeModwin, callerId, contentData, isContentRestored,
          }));
          onFinishLoading?.(contentType);
        } catch (e) {
          contentDispatch(setContentError((e instanceof Error) ? e.message : String(e), {
            contentPath, isScopeModwin, callerId,
          }));
          onFinishLoading?.('error');
        }
      }
    })();
  }, [contentPath, isScopeModwin, callerId, contentData, isContentRestored, onStartLoading, onFinishLoading, loadedContentPath]);


  useEffect(() => () => {
    prevsRef.current = {};
    onDestruct?.();
  }, [onDestruct]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // Dashboard
  if (loadedContentType === 'dashboard') {
    const dashboardClasses = classNames(cssDashboard.dashboard, {
      [cssDashboard.inModwin]: loadedIsScopeModwin,
      [cssDashboard.fadeOut]: fadeOut,
    });

    return (
      <ContentContext.Provider value={contextProviderValue}>
        <div className={dashboardClasses}>
          {/* @ts-expect-error ToDo: React.ComponentType has no ref */}
          <loadedContent.default
            {...(ref && { ref })}
          />
        </div>
      </ContentContext.Provider>
    );
  }


  // Article
  if (loadedContentType === 'article') {
    const articleClasses = classNames(cssArticle.article, {
      [cssArticle.fadeOut]: fadeOut,
    });

    return (
      <ContentContext.Provider value={contextProviderValue}>
        <Scrolling
          {...(loadedCallerId && { id: `viwgf_${loadedIsScopeModwin ? 'modwin' : 'mainScope'}_${loadedCallerId}` })}
          className={articleClasses}
          vertical
          enableKeys
          showBackToTopButton
          shaderColor={layout.content.articleBackground}
          restoreLastPosition={!loadedIsScopeModwin && loadedIsContentRestored}
          {...(hash && { scrollToAnchor: hash.substring(1) })}
        >
          {/* @ts-expect-error ToDo: React.ComponentType has no ref */}
          <loadedContent.default
            {...(ref && { ref })}
          />
        </Scrolling>
      </ContentContext.Provider>
    );
  }


  // Iframe
  if (loadedContentType === 'iframe') {
    const iframeClasses = classNames(cssIframe.iframe, {
      [cssIframe.fadeOut]: fadeOut,
    });

    return (
      <iframe
        className={iframeClasses}
        title="VtWebGuiFramework - External Embedded Content"
        sandbox=""
        src={loadedContentPath}
      />
    );
  }


  // Error Screen
  if (loadedContentType === 'error') {
    return (
      <ErrorScreen
        title="Error loading content"
        subTitle={`Sorry, an error occured while trying to load content "${contentPath}":`}
        message={loadedContentError}
        fadeOut={fadeOut}
      />
    );
  }

  return null;
  //                                                                                  </editor-fold>
};

Content.displayName = 'Content';


export { Content };
