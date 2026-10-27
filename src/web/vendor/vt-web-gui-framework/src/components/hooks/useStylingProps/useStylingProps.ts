import { useMemo, useState } from 'react';

import { useSelector } from 'components/hooks/useSelector';
import { i18nSlice } from 'store/i18n';
import { isNonEmptyString } from 'utils/type';

import type { StylingPropCollection, StylingPropKeys, UseStylingPropsResult } from './useStylingProps.types';
import { deriveProps } from './utils/deriveProps';


/**
 * This hook transforms given props into a CSS inline style object. The props that are available for
 * the component are limited by the given array "usedStylingProps" (2nd argument).
 *
 * This hook is optimized for the following assumptions: 1. usually only a small part of the props
 * listed in "usedStylingProps" is finally used (\< 20%); 2. during inital rendering, the styles of
 * all given props have to be derived; 3. at all further renderings the props change only rarely (at
 * responsivity changes, highlightings and so on).
 * So this hook re-derives the returned style objects every time, if at least one of the given and
 * valid props changes. If the reading direction of the language changes, everything is re-derived
 * too.
 */
export const useStylingProps = (
  /** The object with the given props. Ideally, only props that are processed by this hook should be
   * transferred. This object does not have to be memoized. */
  props: Readonly<StylingPropCollection>,
  /** A list as array with the names of the props that are used by the component that implements
   * this hook. */
  usedStylingProps: Readonly<StylingPropKeys>,
  {
    /** Optionally set to true, if a combined style object named "elemStyle" is returned
     * additionally. */
    addCombinedStyle = false,
    /** Optionally, the ground the call site states for the component: true for dark, false for
     * light. It wins over the ground the background colour sets, which is what a background image
     * needs - its brightness is stated by no colour key. Only a component offering the prop
     * "darkTheme" passes it on. */
    darkTheme,
  }: { addCombinedStyle?: boolean; darkTheme?: boolean | undefined } = { addCombinedStyle: false },
): UseStylingPropsResult => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const isRtl = useSelector(i18nSlice.selectIsCurrentLanguageRtl);

  const [deps, setDeps] = useState<[StylingPropCollection, StylingPropKeys, boolean, boolean, boolean | undefined]>();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const usedPropKeys: StylingPropKeys = useMemo(() => (
    (Object.keys(props) as StylingPropKeys).filter((prop) => (
      usedStylingProps.includes(prop)
      && (isNonEmptyString(props[prop]) || (typeof props[prop] === 'boolean'))
    ))
  ), [props, usedStylingProps]);

  if (
    usedPropKeys.length !== deps?.[1].length
    || usedPropKeys.some((prop) => (props[prop] !== deps[0][prop]))
    || (addCombinedStyle !== deps[2])
    || (isRtl !== deps[3])
    || (darkTheme !== deps[4])
  ) {
    setDeps([props, usedPropKeys, addCombinedStyle, isRtl, darkTheme]);
  }

  const styles = useMemo(() => deriveProps({
    props, usedPropKeys, isRtl, addCombinedStyle, darkTheme,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [deps]);


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


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Return">
  // Return
  // -----------------------------------------------------------------------------------------------

  return styles;
};
