import { SelectBox, type SelectBoxProps, SelectBoxStatus } from 'components/controls/selectBox';
import { useDispatch } from 'components/hooks/useDispatch';
import { useSelector } from 'components/hooks/useSelector';
import { i18nSlice } from 'store/i18n';

import type { SelectLanguageProps } from './selectLanguage.types';


/**
 * React component of the app module "SelectLanguage", a special menu node item to select the
 * language.
 */
const SelectLanguage = ({ disable = false }: SelectLanguageProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const languages = useSelector(i18nSlice.selectAllLanguages);
  const languageCode = useSelector(i18nSlice.selectCurrentLanguageCode);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const options = languages.map<{ value: typeof languageCode; text: string; dir: React.CSSProperties['direction'] }>((l) => ({
    value: l.code,
    text: l.caption,
    dir: (l.isRtl ? 'rtl' : 'ltr'),
  }));


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
   * Handler for the callback prop "onSelect" of the control component "SelectBox".
   */
  const handleSelect: NonNullable<SelectBoxProps<typeof languageCode>['onSelect']> = ({ value }) => {
    if (value) {
      void dispatch(i18nSlice.setLanguageCode(value));
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <SelectBox<typeof languageCode>
      id="viwgf_secondaryHeader_selectLanguage"
      status={disable ? SelectBoxStatus.DISABLED : SelectBoxStatus.IDLE}
      bare
      dense
      options={options}
      value={languageCode}
      onSelect={handleSelect}
    />
  );
  //                                                                                  </editor-fold>
};

SelectLanguage.displayName = 'SelectLanguage';


export { SelectLanguage };
