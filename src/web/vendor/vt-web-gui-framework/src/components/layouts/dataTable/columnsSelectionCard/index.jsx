import PropTypes from 'prop-types';
import {
  memo, useState, useMemo, useCallback,
} from 'react';

import Enums from 'assets/enums';
import Button, { ButtonType, ButtonState } from 'components/controls/button';
import CheckBox, { TICKBOX_MIXED, CheckBoxState } from 'components/controls/checkBox';
import Input from 'components/controls/input';
import Text from 'components/indicators/text';
import Section from 'components/layouts/section';
import Card from 'components/popups/card';

import ColumnGroup from './columnGroup';


/**
 * Memorized React component
 */
const ColumnsSelectionCard = memo(({
  left, right, width, top, bottom, height, insertInPlace, anchorElemRef, placeBesideAnchorElem,
  softAnchor, scrollBarV, title, columns, freezedColumnGroupIds, columnGroupIds, searchBox,
  columnGroupsLabels, columnsLabels, onChangeColumns, onClose,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [searchStr, setSearchStr] = useState('');


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const {
    groupingColumns, allColumnGroupIds, columnsByGroupId, isTotalSelectable,
    isTotalSelectionDisabled, totalValue, totalValueWithoutDisabled, areAllValuesDefault,
  } = useMemo(() => {
    const res = {
      groupingColumns: false,
      allColumnGroupIds: ['CG0'],
      columnsByGroupId: {},
      isTotalSelectable: false,
      isTotalSelectionDisabled: false,
      totalValue: undefined, // considers the values of all visible columns, inclusive the disabled ones
      totalValueWithoutDisabled: undefined, // considers only the values of all visible columns, that are not disabled
      areAllValuesDefault: true,
    };

    if ((freezedColumnGroupIds.length > 0) || (columnGroupIds.length > 0)) {
      res.groupingColumns = true;
      res.allColumnGroupIds = [...freezedColumnGroupIds, ...columnGroupIds];
    }

    const numColumnGroups = res.allColumnGroupIds.length;

    // do for each column group...
    for (let i = 0; i < numColumnGroups; i++) {
      const columnGroupId = res.allColumnGroupIds[i];
      let columnArr = (typeof columns === 'function') ? columns(columnGroupId) : columns,
        isVisible = true, // true means, that the entire column group with its columns is displayed
        showGroupValue = true, // true means, that the column group is visible and can be selected as a whole
        disableGroupValue = false,
        groupValue, // considers the values of all visible columns, inclusive the disabled ones
        groupValueWithoutDisabled, // considers only the values of all visible columns, that are not disabled
        areValuesDefault = true;

      if (!Array.isArray(columnArr)) {
        if (
          columnArr
          && (typeof columnArr === 'object')
          && Array.isArray(columnArr.columns)
        ) {
          columnArr = columnArr.columns;
          isVisible = (columnArr.selection !== 'hidden');
          showGroupValue = isVisible && (columnArr.selection !== 'disabled');
        } else {
          columnArr = [];
        }
      }

      const numColumns = columnArr.length;

      if (isVisible) {
        // do for each column in the column group (if visible) to determine the group value...
        for (let j = 0; j < numColumns; j++) {
          const { hidden, origHidden, selection } = columnArr[j];

          if (selection !== 'hidden') {
            if (groupValue !== TICKBOX_MIXED) {
              if (hidden) {
                if (groupValue === undefined) {
                  groupValue = false;
                } else if (groupValue === true) {
                  groupValue = TICKBOX_MIXED;
                }
              } else if (groupValue === undefined) {
                groupValue = true;
              } else if (groupValue === false) {
                groupValue = TICKBOX_MIXED;
              }
            }

            if ((groupValueWithoutDisabled !== TICKBOX_MIXED) && (selection !== 'disabled')) {
              if (hidden) {
                if (groupValueWithoutDisabled === undefined) {
                  groupValueWithoutDisabled = false;
                } else if (groupValueWithoutDisabled === true) {
                  groupValueWithoutDisabled = TICKBOX_MIXED;
                }
              } else if (groupValueWithoutDisabled === undefined) {
                groupValueWithoutDisabled = true;
              } else if (groupValueWithoutDisabled === false) {
                groupValueWithoutDisabled = TICKBOX_MIXED;
              }
            }

            if (areValuesDefault && (typeof origHidden === 'boolean')) {
              areValuesDefault = (!!hidden === origHidden);
            }
            if (res.areAllValuesDefault && (typeof origHidden === 'boolean')) {
              res.areAllValuesDefault = (!!hidden === origHidden);
            }

            if ((groupValue === TICKBOX_MIXED) && (groupValueWithoutDisabled === TICKBOX_MIXED) && !areValuesDefault && !res.areAllValuesDefault) {
              break;
            }
          }
        }

        if (groupValue === undefined) {
          showGroupValue = false;
        } else if (groupValueWithoutDisabled === undefined) {
          disableGroupValue = true;
        }

        // transfer the value of the column group to the total value (inclusive considering the
        // disabled columns)
        if (res.totalValue !== TICKBOX_MIXED) {
          if (groupValue === false) {
            if (res.totalValue === undefined) {
              res.totalValue = false;
            } else if (res.totalValue === true) {
              res.totalValue = TICKBOX_MIXED;
            }
          } else if (groupValue === true) {
            if (res.totalValue === undefined) {
              res.totalValue = true;
            } else if (res.totalValue === false) {
              res.totalValue = TICKBOX_MIXED;
            }
          } else if (groupValue === TICKBOX_MIXED) {
            res.totalValue = TICKBOX_MIXED;
          }
        }

        // transfer the value of the column group to the total value (without considering the
        // disabled columns)
        if (res.totalValueWithoutDisabled !== TICKBOX_MIXED) {
          if (groupValueWithoutDisabled === false) {
            if (res.totalValueWithoutDisabled === undefined) {
              res.totalValueWithoutDisabled = false;
            } else if (res.totalValueWithoutDisabled === true) {
              res.totalValueWithoutDisabled = TICKBOX_MIXED;
            }
          } else if (groupValueWithoutDisabled === true) {
            if (res.totalValueWithoutDisabled === undefined) {
              res.totalValueWithoutDisabled = true;
            } else if (res.totalValueWithoutDisabled === false) {
              res.totalValueWithoutDisabled = TICKBOX_MIXED;
            }
          } else if (groupValueWithoutDisabled === TICKBOX_MIXED) {
            res.totalValueWithoutDisabled = TICKBOX_MIXED;
          }
        }
      }

      res.columnsByGroupId[columnGroupId] = {
        isVisible,
        columnArr,
        numColumns,
        showGroupValue,
        disableGroupValue,
        groupValue,
        groupValueWithoutDisabled,
        areValuesDefault,
      };
    }

    if (res.totalValue !== undefined) {
      res.isTotalSelectable = true;

      if (res.totalValueWithoutDisabled === undefined) {
        res.isTotalSelectionDisabled = true;
      }
    }

    return res;
  }, [columns, freezedColumnGroupIds, columnGroupIds]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Recursive helper funcion to collect the index of a not disabled entry. If the selection field
   * of the entry is an array with further indexes, this function walks recursively throw this
   * entries. Note that the indexes of hidden entries (where the selection is set to hidden) are
   * also collected.
   */
  const collectIndexes = useCallback((columnGroupId, idx, collection = []) => {
    const { columnArr, numColumns } = columnsByGroupId[columnGroupId];
    if (!collection.includes(idx) && (idx < numColumns) && (columnArr[idx].selection !== 'disabled')) {
      collection.push(idx);

      if (Array.isArray(columnArr[idx].selection)) {
        columnArr[idx].selection.forEach((addIdx) => {
          collectIndexes(columnGroupId, addIdx, collection);
        });
      }
    }

    return collection;
  }, [columnsByGroupId]);


  /**
   * Helper function to get the label of a given column group from the prop "columnGroupsLabels".
   */
  const getColumnGroupLabel = (columnGroupId) => (
    (typeof columnGroupsLabels === 'function')
      ? columnGroupsLabels(columnGroupId)
      : columnGroupsLabels[columnGroupId]
  );


  /**
   * Helper function to get the entry labels from the prop "columnsLabels".
   */
  const getColumnLabel = useCallback((columnGroupId, idx) => {
    if (groupingColumns) {
      return ((typeof columnsLabels === 'function') && columnsLabels(columnGroupId, idx)) ?? `Column ${idx}`;
    }

    return ((typeof columnsLabels === 'function') ? columnsLabels(idx) : columnsLabels[idx]) ?? `Column ${idx}`;
  }, [columnsLabels, groupingColumns]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   *
   */
  const handleReset = useCallback((columnGroupId) => {
    allColumnGroupIds.filter((id) => (!columnGroupId || (id === columnGroupId))).forEach((id) => {
      const { columnArr } = columnsByGroupId[id];

      const nextColumnArr = columnArr.map((col) => {
        if ((col.selection === 'disabled') || (typeof col.origHidden !== 'boolean')) {
          return col;
        }

        return {
          ...col,
          hidden: col.origHidden,
        };
      });

      if (groupingColumns) {
        onChangeColumns(id, nextColumnArr);
      } else {
        onChangeColumns(nextColumnArr);
      }
    });
  }, [onChangeColumns, groupingColumns, allColumnGroupIds, columnsByGroupId]);


  /**
   *
   */
  const handleChangeSearchValue = useCallback((value) => { setSearchStr(value); }, []);


  /**
   *
   */
  const handleClick = useCallback((columnGroupId, idx) => {
    // ---------------------------------------------------------------------------------------------
    if (columnGroupId === '') { // toggle all columns
    // ---------------------------------------------------------------------------------------------

      const nextHidden = (totalValueWithoutDisabled === true);

      allColumnGroupIds.forEach((id) => {
        const { columnArr } = columnsByGroupId[id];

        const nextColumnArr = columnArr.map((col) => {
          if (col.selection === 'disabled') {
            return col;
          }

          return {
            ...col,
            hidden: nextHidden,
            ...(typeof col.origHidden !== 'boolean') && {
              origHidden: !!col.hidden,
            },
          };
        });

        if (groupingColumns) {
          onChangeColumns(id, nextColumnArr);
        } else {
          onChangeColumns(nextColumnArr);
        }
      });
    } else {
      const { columnArr, numColumns, groupValueWithoutDisabled } = columnsByGroupId[columnGroupId];

      // -------------------------------------------------------------------------------------------
      if (idx === undefined) { // toggle the complete column group
      // -------------------------------------------------------------------------------------------

        const nextHidden = (groupValueWithoutDisabled === true);
        const nextColumnArr = columnArr.map((col) => {
          if (col.selection === 'disabled') {
            return col;
          }

          return {
            ...col,
            hidden: nextHidden,
            ...(typeof col.origHidden !== 'boolean') && {
              origHidden: !!col.hidden,
            },
          };
        });

        if (groupingColumns) {
          onChangeColumns(columnGroupId, nextColumnArr);
        } else {
          onChangeColumns(nextColumnArr);
        }

      // -------------------------------------------------------------------------------------------
      } else if (idx < numColumns) { // toggle a single column
      // -------------------------------------------------------------------------------------------

        const nextColumnArr = [...columnArr];
        const hidden = !!columnArr[idx].hidden;

        collectIndexes(columnGroupId, idx).forEach((addIdx) => {
          nextColumnArr[addIdx] = {
            ...nextColumnArr[addIdx],
            hidden: !hidden,
            ...(typeof nextColumnArr[addIdx].origHidden !== 'boolean') && {
              origHidden: hidden,
            },
          };
        });

        if (groupingColumns) {
          onChangeColumns(columnGroupId, nextColumnArr);
        } else {
          onChangeColumns(nextColumnArr);
        }
      }
    }
  }, [onChangeColumns, groupingColumns, allColumnGroupIds, columnsByGroupId, totalValueWithoutDisabled, collectIndexes]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Card
      gridTemplateRows="auto 1fr"
      rowGap={Enums.GapAndPadding.LARGE}
      paddingTop={Enums.GapAndPadding.SMALL}
      paddingBottom={Enums.GapAndPadding.SMALL}
      left={left}
      right={right}
      width={width}
      top={top}
      bottom={bottom}
      height={height}
      insertInPlace={insertInPlace}
      anchorElemRef={anchorElemRef}
      placeBesideAnchorElem={placeBesideAnchorElem}
      softAnchor={softAnchor}
      onClickBeside={onClose}
      onPressEscape={onClose}
      onMoveAnchorElem={onClose}
    >
      <Section
        gridTemplateColumns={isTotalSelectable ? '21px 1fr auto' : '1fr auto'}
        rowGap={Enums.GapAndPadding.SMALL}
        columnGap={Enums.GapAndPadding.XS}
        alignItems={Enums.PlaceSelfItems.BASELINE}
        paddingRight={Enums.GapAndPadding.NORMAL}
        paddingLeft={Enums.GapAndPadding.NORMAL}
      >
        {isTotalSelectable && (
          <CheckBox
            state={isTotalSelectionDisabled ? CheckBoxState.DISABLED : CheckBoxState.IDLE}
            value={totalValue}
            onClick={handleClick}
          />
        )}
        <Text type={Enums.TextType.TITLE} noOverflow>{title}</Text>
        <Button
          type={ButtonType.ICON}
          state={areAllValuesDefault ? ButtonState.DISABLED : ButtonState.IDLE}
          icon="RESET"
          onClick={handleReset}
        />
        {searchBox && (
          <Input
            gridArea="auto / 1 / auto / -1"
            noLine
            withBackground
            {...(searchStr ? {
              deleteButton: true,
            } : {
              trailingIcon: 'SEARCH',
            })}
            value={searchStr}
            onChange={handleChangeSearchValue}
          />
        )}
      </Section>
      <Section
        rowGap={Enums.GapAndPadding.LARGE}
        paddingRight={Enums.GapAndPadding.NORMAL}
        paddingLeft={Enums.GapAndPadding.NORMAL}
        scrollBarV={scrollBarV}
      >
        {allColumnGroupIds.map((columnGroupId) => {
          const {
            isVisible, columnArr, groupValue, showGroupValue, disableGroupValue, areValuesDefault,
          } = columnsByGroupId[columnGroupId];

          if (!isVisible) {
            return null;
          }

          return (
            <ColumnGroup
              key={columnGroupId}
              id={columnGroupId}
              columns={columnArr}
              label={getColumnGroupLabel(columnGroupId)}
              groupValue={groupValue}
              showGroupValue={showGroupValue}
              disableGroupValue={disableGroupValue}
              areValuesDefault={areValuesDefault}
              searchStr={searchStr}
              getColumnLabel={getColumnLabel}
              onClick={handleClick}
              onReset={handleReset}
            />
          );
        })}
      </Section>
    </Card>
  );
  //                                                                                  </editor-fold>
});

ColumnsSelectionCard.displayName = 'ColumnsSelectionCard';

ColumnsSelectionCard.propTypes = {
  left: Card.propTypes.left,
  right: Card.propTypes.right,
  width: Card.propTypes.width,
  top: Card.propTypes.top,
  bottom: Card.propTypes.bottom,
  height: Card.propTypes.height,
  insertInPlace: Card.propTypes.insertInPlace,
  anchorElemRef: Card.propTypes.anchorElemRef,
  placeBesideAnchorElem: Card.propTypes.placeBesideAnchorElem,
  softAnchor: Card.propTypes.softAnchor,
  scrollBarV: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  columns: PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.shape({
    hidden: PropTypes.bool,
    selection: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.number)]),
  }))]).isRequired,
  freezedColumnGroupIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  columnGroupIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  searchBox: PropTypes.bool,
  columnGroupsLabels: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  columnsLabels: PropTypes.oneOfType([PropTypes.func, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))]),
  onChangeColumns: PropTypes.func,
  onClose: PropTypes.func,
};

ColumnsSelectionCard.defaultProps = {
  left: Card.defaultProps.left,
  right: Card.defaultProps.right,
  width: Card.defaultProps.width,
  top: Card.defaultProps.top,
  bottom: Card.defaultProps.bottom,
  height: Card.defaultProps.height,
  insertInPlace: Card.defaultProps.insertInPlace,
  anchorElemRef: Card.defaultProps.anchorElemRef,
  placeBesideAnchorElem: Card.defaultProps.placeBesideAnchorElem,
  softAnchor: Card.defaultProps.softAnchor,
  scrollBarV: false,
  title: '',
  freezedColumnGroupIds: [],
  columnGroupIds: [],
  searchBox: false,
  columnGroupsLabels: {},
  columnsLabels: [],
  onChangeColumns() {},
  onClose() {},
};

export default ColumnsSelectionCard;
