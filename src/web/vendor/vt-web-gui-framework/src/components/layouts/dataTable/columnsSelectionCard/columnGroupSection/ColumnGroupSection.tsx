import { Button, ButtonStatus } from 'components/controls/button';
import { CheckBox, CheckBoxStatus } from 'components/controls/checkBox';
import { Text } from 'components/indicators/text';
import { Tabular, TabularContrItem } from 'components/layouts/tabular';
import { Toolbar, ToolbarContrItem } from 'components/layouts/toolbar';

import type { ColumnGroupSectionProps } from './columnGroupSection.types.ts';


/**
 * React component of the sub-component "ColumnGroupSection" of the columns selection card: one
 * column group as an entry of that card, headed by the group's own check box and reset button and
 * followed by a check box per column of the group.
 */
const ColumnGroupSection = ({
  columnGroupId, groupLabel, showSelectGroup, disableSelectGroup, disableResetGroup, groupValue,
  columns, onSelectGroup, onResetGroup, onSelectColumn,
}: ColumnGroupSectionProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let showToolbar = false,
    reallyShowSelectGroup = false,
    showResetGroup = false;

  if (groupLabel) {
    showToolbar = true;

    if (groupValue !== undefined) {
      reallyShowSelectGroup = showSelectGroup;
      showResetGroup = true;
    }
  }


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
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <Tabular
      paddingRight="small"
      paddingLeft="small"
      borderRadius="small"
      backgroundColor="offWhite"
      boxShadow="contact"
    >
      {showToolbar && (
        <Toolbar>
          <ToolbarContrItem justifyContent="space-between">
            {reallyShowSelectGroup
              ? (
                <CheckBox
                  justifySelf="start"
                  status={disableSelectGroup ? CheckBoxStatus.DISABLED : CheckBoxStatus.IDLE}
                  label={groupLabel!}
                  labelType="label"
                  value={groupValue!}
                  onClick={({ event }) => {
                    onSelectGroup({ id: columnGroupId, event });
                  }}
                />
              )
              : (
                <Text type="label">{groupLabel}</Text>
              )}
            {showResetGroup && (
              <Button
                type="bare"
                status={disableResetGroup ? ButtonStatus.DISABLED : ButtonStatus.IDLE}
                icon="RESET"
                onClick={({ event }) => {
                  onResetGroup({ id: columnGroupId, event });
                }}
              />
            )}
          </ToolbarContrItem>
        </Toolbar>
      )}
      <TabularContrItem>
        {columns.map(({
          idx, label, disabled, value,
        }) => (
          <CheckBox
            key={idx}
            justifySelf="start"
            status={disabled ? CheckBoxStatus.DISABLED : CheckBoxStatus.IDLE}
            label={label}
            value={value}
            onClick={({ event }) => {
              onSelectColumn({ id: columnGroupId, idx, event });
            }}
          />
        ))}
      </TabularContrItem>
    </Tabular>
  );
  //                                                                                  </editor-fold>
};

ColumnGroupSection.displayName = 'ColumnGroupSection';


export { ColumnGroupSection };
