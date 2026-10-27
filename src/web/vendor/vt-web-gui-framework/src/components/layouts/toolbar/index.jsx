import PropTypes from 'prop-types';
import { Children, useCallback } from 'react';

import useStylingProps from 'components/hooks/useStylingProps';
import classNames from 'utils/classNames';

import Title from './title';
import ToggleButton from './toggleButton';
import ToolbarContrItem from './toolbarContrItem';
import stylingProps from './stylingProps';
import css from './toolbar.scss';


/**
 * React component of a toolbar for dashboard contents of VtWebGuiFramework.
 */
const Toolbar = ({
  id, withLine, darkTheme, title, titleType, subTitle, centerTitle, hideFollowing,
  disableToggleButton, onToggleFollowing, children, ...restProps
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { elemStyle } = useStylingProps(restProps, stylingProps, { addCombinedStyle: true });
  const showToggleButton = (typeof hideFollowing === 'boolean');


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleToggleFollowing = useCallback((event) => {
    onToggleFollowing(id, event);
  }, [id, onToggleFollowing]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const toolbarClasses = classNames(css.toolbar, {
    [css.withToggleButton]: showToggleButton,
    [css.withLine]: withLine,
  });

  return (
    <div className={toolbarClasses} style={elemStyle}>
      {showToggleButton && (
        <ToggleButton
          icon={hideFollowing ? 'NAVIUP' : 'NAVIDOWN'}
          disabled={disableToggleButton}
          onClick={handleToggleFollowing}
        />
      )}
      {title && (
        <Title
          darkTheme={darkTheme}
          title={title}
          titleType={titleType}
          subTitle={subTitle}
          centerTitle={centerTitle}
        />
      )}
      {children}
    </div>
  );
  //                                                                                  </editor-fold>
};

Toolbar.displayName = 'Toolbar';

Toolbar.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  withLine: PropTypes.bool,
  darkTheme: PropTypes.bool,
  title: Title.propTypes.title,
  titleType: Title.propTypes.titleType,
  subTitle: Title.propTypes.subTitle,
  centerTitle: Title.propTypes.centerTitle,
  hideFollowing: PropTypes.bool,
  disableToggleButton: PropTypes.bool,
  onToggleFollowing: PropTypes.func,
  children: (props, propName, componentName) => (
    (
      (props[propName] !== null)
      && Children.toArray(props[propName]).some((child) => (child.type !== ToolbarContrItem))
    )
      ? new Error(`Invalid prop "${propName}" passed to "${componentName}". If set, only one or more components of type ToolbarContrItem are expected.`)
      : undefined
  ),
};

Toolbar.defaultProps = {
  id: '',
  withLine: false,
  darkTheme: false,
  title: Title.defaultProps.title,
  titleType: Title.defaultProps.titleType,
  subTitle: Title.defaultProps.subTitle,
  centerTitle: Title.defaultProps.centerTitle,
  hideFollowing: null,
  disableToggleButton: false,
  onToggleFollowing() {},
  children: null,
};

export { ToolbarContrItem };
export default Toolbar;
