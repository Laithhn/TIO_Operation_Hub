import { useEffect, useRef, useState } from 'react';

import SvgLogoVitronic from 'assets/images/logoVitronic.svg';
import { NavigationLink } from 'components/helpers/navigationLink';

import * as css from './headerLogo.scss';
import type { HeaderLogoProps } from './headerLogo.types';


/**
 * React sub-component of the app module "Header" to show a logo image in the header.
 */
const HeaderLogo = ({ logo, onError }: HeaderLogoProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [logoComponent, setLogoComponent] = useState<React.ReactElement | null>(null);

  // The logo this component last took over, held only to notice that it has changed.
  const [prevLogo, setPrevLogo] = useState<typeof logo>(false);

  const loadedLogoRef = useRef<typeof logo>(false);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The VITRONIC logo and no logo at all need nothing loaded, so a change to one of them is taken
  // over in this render. Setting state straight from the render body discards this pass and renders
  // again before anything reaches the screen, where the effect this replaced let the old logo
  // through for the length of a frame. A logo file keeps the old logo until the effect loaded it.
  if (logo !== prevLogo) {
    setPrevLogo(logo);

    if (logo === true) {
      setLogoComponent(<SvgLogoVitronic />);
    } else if (!logo || !process.env['PATH_ASSETS']) {
      setLogoComponent(null);
    }
  }


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
    if (logo !== loadedLogoRef.current) {
      loadedLogoRef.current = logo;

      if ((typeof logo === 'string') && logo && process.env['PATH_ASSETS']) {
        import(/* webpackInclude: /\.(jpe?g|png|svg)$/i */process.env['PATH_ASSETS'] + logo).then((module: { default: string }) => {
          if (/\.svg$/i.test(logo)) {
            setLogoComponent(<module.default />);
          } else if (/\.(?:jpe?g|png)$/i.test(logo)) {
            setLogoComponent(<img src={module.default} alt="" />);
          }
        }).catch((e: unknown) => {
          onError?.(`Trying to load the header logo "${logo}" failed: ${(e instanceof Error) ? e.message : String(e)}`);
        });
      }
    }
  }, [logo, onError]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // if there is no logo, show an empty placeholder instead without link functionality
  if (!logoComponent) {
    return (
      <div className={css.headerLogo} />
    );
  }

  return (
    <NavigationLink id="viwgf_headerLogo" className={css.headerLogo} to="/">
      {logoComponent}
    </NavigationLink>
  );
  //                                                                                  </editor-fold>
};

HeaderLogo.displayName = 'HeaderLogo';


export { HeaderLogo };
