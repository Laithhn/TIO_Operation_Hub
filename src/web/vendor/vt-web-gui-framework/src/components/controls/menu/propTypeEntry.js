import PropTypes from 'prop-types';

import { TICKBOX_MIXED } from 'components/controls/checkBox';


const propTypeShapeEntry = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  hidden: PropTypes.bool,
  disabled: PropTypes.bool,
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.string,
  trailingIcon: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isCheckbox: PropTypes.bool,
  checkboxValue: PropTypes.oneOf([true, false, TICKBOX_MIXED]),
};
propTypeShapeEntry.subEntries = PropTypes.arrayOf(PropTypes.shape(propTypeShapeEntry));

export default PropTypes.shape(propTypeShapeEntry);
