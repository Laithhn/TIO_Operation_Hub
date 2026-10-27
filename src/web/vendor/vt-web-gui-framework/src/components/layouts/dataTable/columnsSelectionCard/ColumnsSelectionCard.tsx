import {
  useCallback, useLayoutEffect, useRef, useState,
} from 'react';

import { layout } from 'assets/styles';
import type { Column, ColumnGroupId } from 'components/helpers/tablePreparer';
import { Text } from 'components/indicators/text';
import { Section, type SectionHandle } from 'components/layouts/section';
import { Card, type CardHandle, type CardProps } from 'components/popups/card';

import { ColumnGroupSection } from './columnGroupSection/ColumnGroupSection';
import type { AllColumns, ColumnsSelectionCardProps, FilteredColumns } from './columnsSelectionCard.types';
import { ColumnsSelectionHeader } from './columnsSelectionHeader/ColumnsSelectionHeader';


const genericGroupId: ColumnGroupId = 'CG0';


/**
 * Recursive helper funcion to collect the indexes of all not disabled columns of a given column
 * array, which hidden values have to switch. If the selection field of the column is an array with
 * further indexes, this function walks recursively throw this entries. Note that the indexes of
 * hidden entries (where the selection is set to hidden) are collected too.
 */
const collectColumnIndexes = (columnArr: Column[], idx: number, collection: number[] = []) => {
  if (!collection.includes(idx) && columnArr[idx] && (columnArr[idx].selection !== 'disabled')) {
    collection.push(idx);

    if (Array.isArray(columnArr[idx].selection)) {
      columnArr[idx].selection.forEach((addIdx) => {
        collectColumnIndexes(columnArr, addIdx, collection);
      });
    }
  }

  return collection;
};


/**
 * React component of the sub-component "ColumnsSelectionCard" of the layout component "DataTable", a
 * card in which the user chooses the columns a data table shows. It carries one entry per column
 * group, each of them holding the check boxes of its columns, and a header that acts on every group
 * at once.
 */
const ColumnsSelectionCard = ({
  id, left, right, width, top, bottom, height, insertInPlace, anchorElemRef,
  placeBesideAnchorElem, softAnchor, title, noColumnHint, columns,
  freezedColumnGroupIds, columnGroupIds, searchBox = false, columnGroupsLabels, columnsLabels,
  onChangeColumns, onClose,
}: ColumnsSelectionCardProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const [searchStr, setSearchStr] = useState('');
  // The height the card needs to show every group without scrolling, measured below; undefined
  // until the first measurement and while there is no group to measure.
  const [contentHeight, setContentHeight] = useState<number>();

  const cardRef = useRef<CardHandle>(null);
  const scrollSectionRef = useRef<SectionHandle>(null);
  const groupsRef = useRef<SectionHandle>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------

  /**
   * Helper function to derive the columns, their groups and their values from the props, the
   * disabled ones included.
   */
  const deriveAllColumns = (): AllColumns => {
    const tmpAllGroupIds: AllColumns['allGroupIds'] = [];
    const allGroupIds: AllColumns['allGroupIds'] = [];
    const byGroupId: AllColumns['byGroupId'] = {};
    let isOnlyOneGenericGroupId = false,
      totalValue: AllColumns['totalValue'],
      totalValueWithoutDisabled: AllColumns['totalValueWithoutDisabled'],
      areAllGroupValuesDefault = true;

    if (((freezedColumnGroupIds?.length ?? 0) > 0) || ((columnGroupIds?.length ?? 0) > 0)) {
      tmpAllGroupIds.push(...freezedColumnGroupIds ?? [], ...columnGroupIds ?? []);
    } else {
      isOnlyOneGenericGroupId = true;
      tmpAllGroupIds.push(genericGroupId);
    }

    // ---------------------------------------------------------------------------------------------
    for (const cgId of tmpAllGroupIds) { // do for each column group...
    // ---------------------------------------------------------------------------------------------

      const columnsData: AllColumns['byGroupId'][ColumnGroupId]['columnsData'] = [];
      let showSelectGroup = true,
        groupValue: AllColumns['byGroupId'][ColumnGroupId]['groupValue'] | undefined,
        groupValueWithoutDisabled: AllColumns['byGroupId'][ColumnGroupId]['groupValueWithoutDisabled'],
        origColumnsArr = (typeof columns === 'function') ? columns(cgId) : columns,
        areAllValuesDefault = true;

      if (Array.isArray(origColumnsArr)) {
        // a plain columns array is taken as it is, it carries no settings of a column group
      } else if (Array.isArray(origColumnsArr.columns) && (origColumnsArr.selection !== 'hidden')) {
        showSelectGroup = (origColumnsArr.selection !== 'disabled');
        origColumnsArr = origColumnsArr.columns;
      } else {
        origColumnsArr = [];
      }

      if (origColumnsArr.some((col) => (col.selection !== 'hidden'))) {
        // -----------------------------------------------------------------------------------------
        for (let idx = 0; idx < origColumnsArr.length; idx++) { // do for each column of the column group...
        // -----------------------------------------------------------------------------------------

          const { hidden, origHidden, selection } = (origColumnsArr as AllColumns['byGroupId'][ColumnGroupId]['origColumnsArr'])[idx]!;

          if (selection !== 'hidden') {
            let label: string;

            if (isOnlyOneGenericGroupId) {
              label = ((typeof columnsLabels === 'function') ? columnsLabels({ columnIdx: idx }) : columnsLabels?.[idx]) ?? `Column ${idx}`;
            } else {
              label = ((typeof columnsLabels === 'function') && columnsLabels({ columnGroupId: cgId, columnIdx: idx })) || `Column ${idx}`;
            }

            if (groupValue !== 'tickBoxMixed') {
              if (hidden) {
                if (groupValue === undefined) {
                  groupValue = false;
                } else if (groupValue) {
                  groupValue = 'tickBoxMixed';
                }
              } else if (groupValue === undefined) {
                groupValue = true;
              } else if (!groupValue) {
                groupValue = 'tickBoxMixed';
              }
            }

            if ((groupValueWithoutDisabled !== 'tickBoxMixed') && (selection !== 'disabled')) {
              if (hidden) {
                if (groupValueWithoutDisabled === undefined) {
                  groupValueWithoutDisabled = false;
                } else if (groupValueWithoutDisabled) {
                  groupValueWithoutDisabled = 'tickBoxMixed';
                }
              } else if (groupValueWithoutDisabled === undefined) {
                groupValueWithoutDisabled = true;
              } else if (!groupValueWithoutDisabled) {
                groupValueWithoutDisabled = 'tickBoxMixed';
              }
            }

            if ((typeof origHidden === 'boolean') && (!!hidden !== origHidden)) {
              areAllValuesDefault = false;
              areAllGroupValuesDefault = false;
            }

            columnsData.push({
              idx,
              label,
              disabled: (selection === 'disabled'),
              value: !hidden,
            });
          }
        } // end of the columns loop

        allGroupIds.push(cgId);
        byGroupId[cgId] = {
          showSelectGroup,
          groupLabel: (typeof columnGroupsLabels === 'function') ? columnGroupsLabels(cgId) : columnGroupsLabels?.[cgId],
          groupValue: groupValue!,
          groupValueWithoutDisabled,
          origColumnsArr,
          columnsData,
          areAllValuesDefault,
        };

        // transfer the value of the column group to the total value (inclusive considering the
        // disabled columns)
        if (totalValue !== 'tickBoxMixed') {
          if (groupValue === false) {
            if (totalValue === undefined) {
              totalValue = false;
            } else if (totalValue) {
              totalValue = 'tickBoxMixed';
            }
          } else if (groupValue === true) {
            if (totalValue === undefined) {
              totalValue = true;
            } else if (!totalValue) {
              totalValue = 'tickBoxMixed';
            }
          } else if (groupValue === 'tickBoxMixed') {
            totalValue = 'tickBoxMixed';
          }
        }
      }

    // transfer the value of the column group to the total value (without considering the
    // disabled columns)
      if (totalValueWithoutDisabled !== 'tickBoxMixed') {
        if (groupValueWithoutDisabled === false) {
          if (totalValueWithoutDisabled === undefined) {
            totalValueWithoutDisabled = false;
          } else if (totalValueWithoutDisabled) {
            totalValueWithoutDisabled = 'tickBoxMixed';
          }
        } else if (groupValueWithoutDisabled === true) {
          if (totalValueWithoutDisabled === undefined) {
            totalValueWithoutDisabled = true;
          } else if (!totalValueWithoutDisabled) {
            totalValueWithoutDisabled = 'tickBoxMixed';
          }
        } else if (groupValueWithoutDisabled === 'tickBoxMixed') {
          totalValueWithoutDisabled = 'tickBoxMixed';
        }
      }
    } // end of the column groups loop

    return {
      isOnlyOneGenericGroupId, allGroupIds, byGroupId, totalValue, totalValueWithoutDisabled,
      areAllGroupValuesDefault,
    };
  };


  const allColumns = deriveAllColumns();


  /**
   * Helper function to derive the columns the search string leaves, by group; a group with none of
   * them left drops out.
   */
  const deriveFilteredColumns = (): FilteredColumns => {
    const byGroupId = allColumns.allGroupIds.reduce<AllColumns['byGroupId']>((acc, cgId) => {
      const cg = {
        ...allColumns.byGroupId[cgId]!,
        columnsData: allColumns.byGroupId[cgId]!.columnsData.filter(({ label }) => (
          !searchStr
          || label.toLowerCase().includes(searchStr)
        )),
      };

      if (cg.columnsData.length === 0) {
        return acc;
      }

      return {
        ...acc,
        [cgId]: cg,
      };
    }, {});

    return {
      byGroupId,
      allGroupIds: Object.keys(byGroupId),
    };
  };


  const filteredColumns = deriveFilteredColumns();


  /**
   * Helper function to measure the height the card needs to show every group without scrolling,
   * from three rectangles: the card's, the scrolling section's and that of the section holding the
   * groups. The card less the scrolling section is the frame that stands whatever the groups
   * measure - header, gap, paddings, edges - and the groups' own section is as tall as its content,
   * however tall the scrolling section around it is. No padding or edge is repeated here as a
   * number, so the measurement follows any change to them.
   *
   * It keeps its useCallback for the layout effect below, which registers it as the listener of the
   * event "domChange" and has it in its dependencies - react-hooks/exhaustive-deps, which knows
   * nothing of the React Compiler, asks for a stable identity there.
   */
  const deriveHeight = useCallback(() => {
    const cardRect = cardRef.current?.getBoundingClientRect();
    const scrollSectionRect = scrollSectionRef.current?.getBoundingClientRect();
    const groupsRect = groupsRef.current?.getBoundingClientRect();
    const nextHeight = (cardRect && scrollSectionRect && groupsRect)
      ? Math.ceil(cardRect.height - scrollSectionRect.height + groupsRect.height)
      : undefined;

    setContentHeight((prevHeight) => ((prevHeight === nextHeight) ? prevHeight : nextHeight));
  }, []);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onSelectAll" of the sub-component "ColumnsSelectionHeader" to
   * toggle the hidden flags of all non-disabled columns of all column groups.
   */
  const handleSelectAll: React.ComponentProps<typeof ColumnsSelectionHeader>['onSelectAll'] = () => {
    const nextHidden = (allColumns.totalValueWithoutDisabled === true);

    allColumns.allGroupIds.forEach((cgId) => {
      const nextColumnArr = allColumns.byGroupId[cgId]!.origColumnsArr.map((col) => {
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

      onChangeColumns?.({
        ...(!allColumns.isOnlyOneGenericGroupId && { columnGroupId: cgId }),
        columns: nextColumnArr,
      });
    });
  };


  /**
   * Handler for the callback prop "onResetAll" of the sub-component "ColumnsSelectionHeader" to
   * reset the hidden flags of all non-disabled columns of all column groups to their original
   * values.
   */
  const handleResetAll: React.ComponentProps<typeof ColumnsSelectionHeader>['onResetAll'] = () => {
    allColumns.allGroupIds.forEach((cgId) => {
      const nextColumnArr = allColumns.byGroupId[cgId]!.origColumnsArr.map((col) => {
        if ((col.selection === 'disabled') || (typeof col.origHidden !== 'boolean')) {
          return col;
        }

        return {
          ...col,
          hidden: col.origHidden,
        };
      });

      onChangeColumns?.({
        ...(!allColumns.isOnlyOneGenericGroupId && { columnGroupId: cgId }),
        columns: nextColumnArr,
      });
    });
  };


  /**
   * Handler for the callback prop "onChangeSearchString" of the sub-component
   * "ColumnsSelectionHeader".
   */
  const handleChangeSearchString: React.ComponentProps<typeof ColumnsSelectionHeader>['onChangeSearchString'] = ({ value }) => {
    setSearchStr(String(value ?? '').toLowerCase());
  };


  /**
   * Handler for the callback prop "onSelectGroup" of the sub-component "ColumnGroupSection" to
   * toggle the hidden flags of all non-disabled columns of a column group.
   */
  const handleSelectGroup: React.ComponentProps<typeof ColumnGroupSection>['onSelectGroup'] = ({ id: cgId }) => {
    if (allColumns.byGroupId[cgId]) {
      const nextHidden = (allColumns.byGroupId[cgId].groupValueWithoutDisabled === true);

      const nextColumnArr = allColumns.byGroupId[cgId].origColumnsArr.map((col) => {
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

      onChangeColumns?.({
        ...(!allColumns.isOnlyOneGenericGroupId && { columnGroupId: cgId }),
        columns: nextColumnArr,
      });
    }
  };


  /**
   * Handler for the callback prop "onResetGroup" of the sub-component "ColumnGroupSection" to reset
   * the hidden flags of all non-disabled columns of a column group to their original values.
   */
  const handleResetGroup: React.ComponentProps<typeof ColumnGroupSection>['onResetGroup'] = ({ id: cgId }) => {
    if (allColumns.byGroupId[cgId]) {
      const nextColumnArr = allColumns.byGroupId[cgId].origColumnsArr.map((col) => {
        if ((col.selection === 'disabled') || (typeof col.origHidden !== 'boolean')) {
          return col;
        }

        return {
          ...col,
          hidden: col.origHidden,
        };
      });

      onChangeColumns?.({
        ...(!allColumns.isOnlyOneGenericGroupId && { columnGroupId: cgId }),
        columns: nextColumnArr,
      });
    }
  };


  /**
   * Handler for the callback prop "onSelectColumn" of the sub-component "ColumnGroupSection" to
   * toggle the hidden flag of a single column of a column group.
   */
  const handleSelectColumn: React.ComponentProps<typeof ColumnGroupSection>['onSelectColumn'] = ({ id: cgId, idx }) => {
    if (
      allColumns.byGroupId[cgId]?.origColumnsArr[idx]
      && (allColumns.byGroupId[cgId].origColumnsArr[idx].selection !== 'disabled')
    ) {
      const nextColumnArr = [...allColumns.byGroupId[cgId].origColumnsArr];
      const hidden = !!nextColumnArr[idx]!.hidden;

      collectColumnIndexes(nextColumnArr, idx).forEach((i) => {
        nextColumnArr[i] = {
          ...nextColumnArr[i],
          hidden: !hidden,
          ...(typeof nextColumnArr[i]?.origHidden !== 'boolean') && {
            origHidden: hidden,
          },
        };
      });

      onChangeColumns?.({
        ...(!allColumns.isOnlyOneGenericGroupId && { columnGroupId: cgId }),
        columns: nextColumnArr,
      });
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  // The measurement runs after every render, so a change of the groups - the search filter, a column
  // layout given anew - reaches the height before anything is painted: the first pass renders the
  // card without a height and measures it, the second one draws it, and a state set only where the
  // value changed is what ends the cycle. It runs again on every change of the DOM around the card,
  // which is what moves the room the card has.
  useLayoutEffect(deriveHeight);

  useLayoutEffect(() => {
    document.addEventListener('domChange', deriveHeight);

    return () => {
      document.removeEventListener('domChange', deriveHeight);
    };
  }, [deriveHeight]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  // The header stands still and the groups below it scroll. For that the card needs a height: a
  // scrolling section contributes none of its own, so without one the card would be as tall as its
  // header and the groups would have no room at all. The height is the measured one from above
  // unless the consumer states one; the card caps either at the room the viewport leaves it. Where
  // the consumer names no vertical fixpoint, the card keeps the distance to the viewport's edge
  // every popup of a control keeps.
  const cardHeight = height ?? contentHeight;

  return (
    <Card
      ref={cardRef}
      gridTemplateRows="auto 1fr"
      rowGap="large"
      paddingTop="normal"
      paddingRight="small"
      paddingBottom="small"
      paddingLeft="small"
      borderRadius="normal"
      {...(id && { id })}
      {...(left && { left })}
      {...(right && { right })}
      {...(width && { width })}
      top={top ?? -layout.controlMenus.spaceToDocument}
      bottom={bottom ?? -layout.controlMenus.spaceToDocument}
      {...((cardHeight !== undefined) && { height: cardHeight })}
      {...(insertInPlace && { insertInPlace })}
      {...(anchorElemRef && { anchorElemRef })}
      {...(placeBesideAnchorElem && { placeBesideAnchorElem })}
      {...(softAnchor && { softAnchor })}
      {...(onClose && {
        onClickBeside: onClose as NonNullable<CardProps['onClickBeside']>,
        onPressEscape: onClose as NonNullable<CardProps['onPressEscape']>,
        onMoveAnchorElem: onClose as NonNullable<CardProps['onMoveAnchorElem']>,
      })}
    >
      <ColumnsSelectionHeader
        title={title}
        disableSelectAll={(allColumns.totalValueWithoutDisabled === undefined)}
        disableResetAll={allColumns.areAllGroupValuesDefault}
        showSearchBox={searchBox}
        searchString={searchStr}
        totalValue={allColumns.totalValue}
        onSelectAll={handleSelectAll}
        onResetAll={handleResetAll}
        onChangeSearchString={handleChangeSearchString}
      />
      {(filteredColumns.allGroupIds.length > 0)
        ? (
          <Section ref={scrollSectionRef} scrollBarV>
            {/* The groups stand in a section of their own inside the scrolling one, so that their
                natural height can be measured: the scrolling section is as tall as its row, this one
                as tall as its content. */}
            <Section ref={groupsRef} rowGap="large">
              {filteredColumns.allGroupIds.map((cgId) => {
                const {
                  showSelectGroup, groupLabel, groupValue, groupValueWithoutDisabled, columnsData, areAllValuesDefault,
                } = filteredColumns.byGroupId[cgId]!;

                return (
                  <ColumnGroupSection
                    key={cgId}
                    columnGroupId={cgId}
                    groupLabel={groupLabel}
                    showSelectGroup={showSelectGroup}
                    disableSelectGroup={(groupValueWithoutDisabled === undefined)}
                    disableResetGroup={areAllValuesDefault}
                    groupValue={groupValue}
                    columns={columnsData}
                    onSelectGroup={handleSelectGroup}
                    onResetGroup={handleResetGroup}
                    onSelectColumn={handleSelectColumn}
                  />
                );
              })}
            </Section>
          </Section>
        )
        : (
          <Section paddingRight="normal" paddingLeft="normal">
            <Text type="hint">{noColumnHint}</Text>
          </Section>
        )}
    </Card>
  );
  //                                                                                  </editor-fold>
};

ColumnsSelectionCard.displayName = 'ColumnsSelectionCard';


export { ColumnsSelectionCard };
