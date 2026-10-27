import { useEffect, useRef, useState } from 'react';

import * as cssDashboard from 'app/modules/content/dashboard.scss';
import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { SliceStatus } from 'store';
import { classNames } from 'utils/classNames';

import * as css from './footer.scss';
import { selectContentPath, setStatus } from './footer.slice';


/**
 * React component of the app module "Footer".
 */
const Footer = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const contentPath = useSelector(selectContentPath);

  const [contentComponent, setContentComponent] = useState<React.ReactElement | undefined>();

  const loadedContentPathRef = useRef('');


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // Without a content path there is no content, so the one loaded last goes in this render. Setting
  // state straight from the render body is what React asks for to answer a changed state - it
  // discards this pass and renders again before anything reaches the screen, where the effect this
  // replaced let the old content through for the length of a frame.
  if (!contentPath && contentComponent) {
    setContentComponent(undefined);
  }


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  const dispatch = useDispatch();


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    dispatch(setStatus(SliceStatus.INIT));

    return () => {
      dispatch(setStatus(SliceStatus.PENDING));
    };
  }, [dispatch]);


  useEffect(() => {
    if (process.env['PATH_CONTENTS'] && (contentPath !== loadedContentPathRef.current)) {
      loadedContentPathRef.current = contentPath;
      dispatch(setStatus(SliceStatus.LOADING));

      if (contentPath) {
        import(/* webpackInclude: /content\.[jt]sx$/i */process.env['PATH_CONTENTS'] + contentPath).then((module: { default: React.ComponentType }) => {
          const displayName = module.default.displayName ?? '';

          if (!/Dashboard/i.test(displayName)) {
            throw new Error(`The root component of the content to be loaded has an invalid display name: "${displayName}". The display name must contain "Dashboard". Please set it in the root component of this content.`);
          }

          setContentComponent(<module.default />);
          dispatch(setStatus(SliceStatus.READY));
        }).catch((e: unknown) => {
          dispatch(setStatus(SliceStatus.ERROR, `Trying to load footer content "${contentPath}" failed: ${(e instanceof Error) ? e.message : String(e)}`));
        });
      } else {
        dispatch(setStatus(SliceStatus.READY));
      }
    }
  }, [dispatch, contentPath]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // No content, no footer!
  if (!contentComponent) {
    return null;
  }

  return (
    <div className={classNames(css.footer, cssDashboard.dashboard)}>
      {contentComponent}
    </div>
  );
  //                                                                                  </editor-fold>
};

Footer.displayName = 'Footer';


export { Footer };
