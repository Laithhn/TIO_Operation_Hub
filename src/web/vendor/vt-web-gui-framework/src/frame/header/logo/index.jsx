import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import SvgLogoVitronic from 'assets/images/logoVitronic.svg';
import { selectors } from 'store';

import css from './logo.scss';


/**
 * React component of the company logo in the header.
 */
const Logo = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const logo = useSelector(selectors.app.getLogo);

  const [logoComponent, setLogoComponent] = useState(null);


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
    if (logo === true) {
      setLogoComponent(<SvgLogoVitronic />);
    } else if (!logo) {
      setLogoComponent(null);
    } else {
      import(/* webpackInclude: /\.(jpe?g|png|svg)$/i */process.env.PATH_ASSETS + logo).then((module) => { // eslint-disable-line prefer-template
        if (logo.match(/\.svg$/i)) {
          setLogoComponent(<module.default />);
        } else if (logo.match(/\.(jpe?g|png)$/i)) {
          setLogoComponent(<img src={module.default} alt="" />);
        }
      });
    }
  }, [logo]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // if there is no logo, show an empty placeholder instead without link functionality
  if (!logoComponent) {
    return (
      <div className={css.logo} />
    );
  }

  return (
    <Link
      to={{ pathname: '/' }}
      {...((process.env.NODE_ENV === 'development') && { id: 'header__logo' })}
      className={css.logo}
    >
      {logoComponent}
    </Link>
  );
  //                                                                                  </editor-fold>
};

Logo.displayName = 'Logo';

export default Logo;
