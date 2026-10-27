import { layout } from 'assets/styles';
import { Button, ButtonStatus } from 'components/controls/button';
import { CheckBox, CheckBoxStatus } from 'components/controls/checkBox';
import { Input } from 'components/controls/input';
import { Text } from 'components/indicators/text';
import { Section } from 'components/layouts/section';

import type { ColumnsSelectionHeaderProps } from './columnsSelectionHeader.types.ts';


/**
 * React component of the sub-component "ColumnsSelectionHeader" of the columns selection card: the
 * head of that card, holding its title, the check box and the reset button that act on every column
 * group at once, and the search box that filters the columns by their labels.
 */
const ColumnsSelectionHeader = ({
  title, disableSelectAll, disableResetAll, showSearchBox, searchString, totalValue, onSelectAll,
  onResetAll, onChangeSearchString,
}: ColumnsSelectionHeaderProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  let gridTemplateColumns = '1fr',
    showTitle = false,
    showControls = false;

  if (title) {
    showTitle = true;

    if (totalValue !== undefined) {
      // The first track holds the check box without a label, whose whole width is its icon - and
      // that icon is as wide as it is high, which is the height every control of the framework
      // shares.
      gridTemplateColumns = `${layout.controls.heightDefault}px ${gridTemplateColumns} auto`;
      showControls = true;
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

  if (!showTitle && !showControls && !showSearchBox) {
    return null;
  }


  return (
    <Section
      gridTemplateColumns={gridTemplateColumns}
      gap="xs"
      alignItems="baseline"
      paddingRight="small"
      paddingLeft="small"
    >
      {showControls && (
        <CheckBox status={disableSelectAll ? CheckBoxStatus.DISABLED : CheckBoxStatus.IDLE} value={totalValue!} onClick={onSelectAll} />
      )}
      {showTitle && <Text type="title" textOverflowEllipsis>{title}</Text>}
      {showControls && (
        <Button
          type="bare"
          status={disableResetAll ? ButtonStatus.DISABLED : ButtonStatus.IDLE}
          icon="RESET"
          onClick={onResetAll}
        />
      )}
      {showSearchBox && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <Input
          gridArea="auto / 1 / auto / -1"
          {...(searchString
            ? { deleteButton: true }
            : { trailingIcon: 'SEARCH' }
          )}
          value={searchString}
          onChange={onChangeSearchString}
        />
      )}
    </Section>
  );
  //                                                                                  </editor-fold>
};

ColumnsSelectionHeader.displayName = 'ColumnsSelectionHeader';


export { ColumnsSelectionHeader };
