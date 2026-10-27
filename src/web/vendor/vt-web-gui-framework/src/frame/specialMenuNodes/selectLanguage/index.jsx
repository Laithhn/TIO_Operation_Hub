import PropTypes from 'prop-types';
import { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import Enums from 'assets/enums';
import SelectBox, { SelectBoxState } from 'components/controls/selectBox';
import { actions, selectors } from 'store';


/**
 * React component of a special menu node item to select the language.
 */
const SelectLanguage = ({ disabled, darkTheme }) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const languages = useSelector(selectors.i18n.getAllLanguages);
  const languageCode = useSelector(selectors.i18n.getCurrentLanguageCode);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const options = useMemo(() => languages.map((l) => ({
    value: l.code,
    text: l.caption,
    dir: l.isRtl ? Enums.ReadingDirection.RTL : Enums.ReadingDirection.LTR,
  })), [languages]);


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
  const handleSelect = useCallback((code) => {
    dispatch(actions.i18n.setLanguageCode(code));
  }, [dispatch]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <SelectBox
      htmlId="specialMenuNodes__selectLanguage"
      state={disabled ? SelectBoxState.DISABLED : SelectBoxState.IDLE}
      darkTheme={darkTheme}
      options={options}
      value={languageCode}
      onSelect={handleSelect}
    />
  );
  //                                                                                  </editor-fold>
};

SelectLanguage.displayName = 'SelectLanguage';

SelectLanguage.propTypes = {
  disabled: PropTypes.bool,
  darkTheme: PropTypes.bool,
};

SelectLanguage.defaultProps = {
  disabled: false,
  darkTheme: false,
};

export default SelectLanguage;
