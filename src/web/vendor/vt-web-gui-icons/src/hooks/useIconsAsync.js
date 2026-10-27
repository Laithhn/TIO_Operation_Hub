import { useState, useCallback, useEffect } from 'react';


/**
 * React hook to use the icons by properties and functions asynchronously. The icons itselves are
 * loaded dynamically in an effect. Use this hook instead of /src/index.js, if you not want to
 * include the icons in your main bundle by webpack. Loading dynamically will lead to creating an
 * extranous chunk with the icons data.
 *
 * @return {{ isLoaded: boolean, viewbox: string, allIconNames: string[], iconExists: function, getIconPath: function, getIconKeywords: function }}
 */
const useIconsAsyns = () => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [iconData, setIconData] = useState({
    isLoaded: false,
    viewbox: '',
    collection: {},
    allIconNames: [],
  });


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Function that returns true, if the icons are loaded and if the icon, selected by its name
   * exists or false if not.
   *
   * @param {string} iconName - The name of the icon, case insensitive.
   *
   * @return {boolean}
   */
  const iconExists = useCallback((iconName) => (
    (typeof iconName === 'string')
    && iconData.isLoaded
    && !!iconData.collection[iconName.toUpperCase()]
  ), [iconData]);


  /**
   * Function to return the SVG path of an icon, selected by the name of the icon. If the icons are
   * not yet loaded or if the icon name is invalid, undefined is returned.
   *
   * @param {string} iconName - The name of the icon, case insensitive.
   *
   * @return {string}
   */
  const getIconPath = useCallback((iconName) => (
    iconData.collection[iconName.toUpperCase()]?.svgPath
  ), [iconData]);


  /**
   * Function to return an array with some optional keywords of an icon, selected by the name of the
   * icon. If the icons are not yet loaded of if the icon name is invalid, an empty array is
   * returned.
   *
   * @param {string} iconName - The name of the icon.
   *
   * @return {string[]}
   */
  const getIconKeywords = useCallback((iconName) => (
    iconData.collection[iconName.toUpperCase()]?.keywords ?? []
  ), [iconData]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      const icons = await import('../assets/icons.json').then((module) => module.default);

      setIconData((prevValue) => (!prevValue.isLoaded
        ? {
          isLoaded: true,
          viewbox: icons.viewbox,
          collection: icons.collection,
          allIconNames: Object.keys(icons.collection),
        } : prevValue));
    })();
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Return
  // -----------------------------------------------------------------------------------------------

  return {
    isLoaded: iconData.isLoaded,
    viewbox: iconData.viewbox,
    allIconNames: iconData.allIconNames,
    iconExists,
    getIconPath,
    getIconKeywords,
  };
  //                                                                                  </editor-fold>
};

export default useIconsAsyns;
