import PropTypes from 'prop-types';
import { memo, useContext } from 'react';

import ContextScope from 'components/contexts/contextScope';
import classNames from 'utils/classNames';

import css from './title.scss';


/**
 * Memoized React component of the title used in component MainToolbar.
 */
const Title = memo(({ title, subTitle }) => {
  const { isScopeModwin } = useContext(ContextScope);

  const mainToolbarTitleClasses = classNames(css.title, {
    [css.inModwin]: isScopeModwin,
  });

  return (
    <div className={mainToolbarTitleClasses}>
      {title && <span className={css.titleText}>{title}</span>}
      {title && subTitle && <span className={css.subTitleText}>{subTitle}</span>}
    </div>
  );
});

Title.displayName = 'Title';

Title.propTypes = {
  title: PropTypes.string,
  subTitle: PropTypes.string,
};

Title.defaultProps = {
  title: '',
  subTitle: '',
};

export default Title;
