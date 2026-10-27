import PropTypes from 'prop-types';
import { useMemo, useCallback } from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType, ButtonState } from 'components/controls/button';
import CheckBox, { TICKBOX_MIXED, CheckBoxState } from 'components/controls/checkBox';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import Toolbar, { ToolbarContrItem } from 'components/layouts/toolbar';


/**
 * React component
 */
const ColumnGroup = ({
  id, columns, label, groupValue, showGroupValue, disableGroupValue, areValuesDefault, searchStr,
  getColumnLabel, onClick, onReset,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const filteredColumns = useMemo(() => {
    const modSearchStr = searchStr ? searchStr.toLowerCase() : null;

    return columns.reduce((acc, { hidden, selection }, idx) => {
      if (selection === 'hidden') {
        return acc;
      }

      const columnLabel = getColumnLabel(id, idx);

      if (modSearchStr && !columnLabel.toLowerCase().includes(modSearchStr)) {
        return acc;
      }

      return [
        ...acc,
        {
          idx,
          columnLabel,
          hidden,
          disabled: (selection === 'disabled'),
        },
      ];
    }, []);
  }, [id, columns, searchStr, getColumnLabel]);


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
  const handleClickGroup = useCallback(() => {
    onClick(id);
  }, [id, onClick]);


  /**
   *
   */
  const handleReset = useCallback(() => {
    onReset(id);
  }, [id, onReset]);


  /**
   *
   */
  const handleClickColumn = useCallback((idx) => {
    onClick(id, idx);
  }, [id, onClick]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  if (filteredColumns.length === 0) {
    return null;
  }

  return (
    <Section rowGap={Enums.GapAndPadding.XS}>
      {label && (
        <Toolbar withLine>
          <ToolbarContrItem justifyContent={Enums.PlaceContent.SPACE_BETWEEN}>
            {showGroupValue
              ? (
                <CheckBox
                  justifySelf={Enums.PlaceSelfItems.START}
                  state={disableGroupValue ? CheckBoxState.DISABLED : CheckBoxState.IDLE}
                  text={label}
                  textType={Enums.TextType.LABEL}
                  value={groupValue}
                  onClick={handleClickGroup}
                />
              ) : (
                <Text type={Enums.TextType.LABEL}>{label}</Text>
              )}
            <Button
              type={ButtonType.ICON}
              state={areValuesDefault ? ButtonState.DISABLED : ButtonState.IDLE}
              icon="RESET"
              onClick={handleReset}
            />
          </ToolbarContrItem>
        </Toolbar>
      )}
      {filteredColumns.map(({
        idx, columnLabel, hidden, disabled,
      }) => (
        <CheckBox
          key={idx}
          justifySelf={Enums.PlaceSelfItems.START}
          id={idx}
          state={disabled ? CheckBoxState.DISABLED : CheckBoxState.IDLE}
          text={columnLabel}
          value={!hidden}
          onClick={handleClickColumn}
        />
      ))}
    </Section>
  );
  //                                                                                  </editor-fold>
};

ColumnGroup.displayName = 'ColumnGroup';

ColumnGroup.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    hidden: PropTypes.bool,
    selection: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.number)]),
  })),
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  groupValue: PropTypes.oneOf([false, true, TICKBOX_MIXED]),
  showGroupValue: PropTypes.bool,
  disableGroupValue: PropTypes.bool,
  areValuesDefault: PropTypes.bool,
  searchStr: PropTypes.string,
  getColumnLabel: PropTypes.func,
  onClick: PropTypes.func,
  onReset: PropTypes.func,
};

ColumnGroup.defaultProps = {
  columns: [],
  label: null,
  groupValue: false,
  showGroupValue: false,
  disableGroupValue: false,
  areValuesDefault: false,
  searchStr: '',
  getColumnLabel() {},
  onClick() {},
  onReset() {},
};

export default ColumnGroup;
