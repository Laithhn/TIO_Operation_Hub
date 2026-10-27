import { useCallback, useMemo } from 'react';

import { layout, space, typo } from 'assets/styles';
import {
  type CellIterator, type Column, type DatasetId, type DatasetLayout, DataTable, type DataTableProps,
} from 'components/layouts/dataTable';
import { measureText } from 'utils/measureText';
import { isNonEmptyStringOrNumber } from 'utils/type';

import { iconExists } from 'VtWebGuiIcons/src';

import { Divider } from '../divider/Divider';
import * as dividerCss from '../divider/divider.scss';
import { MenuItem } from '../menuItem/MenuItem';
import * as menuItemCss from '../menuItem/menuItem.scss';

import * as css from './longMenu.scss';
import type { LongMenuProps, ModEntries } from './longMenu.types.ts';


// The measures of a divider and of an item's icons, from the stylesheets that draw with them.
const dividerSpace = Number(dividerCss.dividerSpace);
const leadingIconColumnWidth = Number(menuItemCss.leadingIconColumnWidth);
const trailingIconMargin = Number(menuItemCss.trailingIconMargin);

// the dataset layouts for the data table
const datasetLayouts: Record<'divider' | 'menuItem', DatasetLayout> = {
  divider: {
    id: 'divider',
    rows: [{ height: (dividerSpace * 2) + 1, cells: ['divider'] }],
    noBottomLine: true,
  },
  menuItem: {
    id: 'menuItem',
    rows: [{ height: layout.controlMenus.optionHeight, cells: ['menuItem'] }],
    noBottomLine: true,
  },
};


/**
 * React sub-component of the popup component "Menu" to show menu items in a data table like list
 * without submenus.
 */
const LongMenu = ({
  entries, limitMenu, onClick,
}: LongMenuProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The entries prepared for rendering, together with the width and the height of the menu and the
  // one column of its data table; the width is that of the widest entry. It keeps its useMemo: the
  // data table derives the whole table anew whenever the identity of its columns or of its dataset
  // IDs changes, which the React Compiler would keep stable only as long as it compiles this
  // component.
  const { modEntries, longMenuStyle, columns } = useMemo(() => {
    const res: {
      modEntries: ModEntries;
      longMenuStyle: React.CSSProperties;
      columns: Column[];
    } = {
      modEntries: {
        byId: {},
        allIds: [],
      },
      longMenuStyle: {},
      columns: [],
    };

    const areLeadingIconsByGroup: Record<number, boolean> = {};
    const areTrailingIconsByGroup: Record<number, boolean> = {};
    let group = 0,
      maxWidth = 0;

    for (
      const entry of (entries ?? []).filter((e) => (
        (e?.isHidden !== true)
        && (!Array.isArray(e?.subEntries) || (e.subEntries.length === 0))
      ))
    ) {
      if (!entry) {
        // if there is a divider: entries between dividers are grouped together
        res.modEntries.byId[`DIVIDER_${group}`] = null;
        group++;
      } else if (isNonEmptyStringOrNumber(entry.id) && isNonEmptyStringOrNumber(entry.text)) {
        const isCheckBox = (entry.checkBoxValue !== undefined);
        // there can only be a real leading icon, if given and valid and if the entry is not a
        // checkbox
        const isRealLeadingIcon = !isCheckBox && iconExists(entry.icon);
        const isTrailingIcon = isNonEmptyStringOrNumber(entry.trailingIcon);

        if (!areLeadingIconsByGroup[group]) {
          areLeadingIconsByGroup[group] = isRealLeadingIcon || isCheckBox; // note: a checkbox needs space like a leading icon too
        }

        if (!areTrailingIconsByGroup[group]) {
          areTrailingIconsByGroup[group] = isTrailingIcon;
        }

        res.modEntries.byId[entry.id] = {
          id: entry.id,
          group,
          isDisabled: !!entry.isDisabled,
          text: entry.text,
          icon: isRealLeadingIcon ? entry.icon : undefined,
          trailingIcon: isTrailingIcon ? entry.trailingIcon : undefined,
          checkBoxValue: entry.checkBoxValue,
        };
      }
    }

    res.modEntries.allIds = Object.keys(res.modEntries.byId);

    for (const entryId of res.modEntries.allIds) {
      const entry = res.modEntries.byId[entryId];

      if (entry) {
        const isLeadingIconPlaceholder = areLeadingIconsByGroup[entry.group] && (entry.checkBoxValue === undefined);
        const trailingIcon = areTrailingIconsByGroup[entry.group] ? (entry.trailingIcon ?? '') : entry.trailingIcon;
        let width = measureText(String(entry.text), { fontSize: typo.fontSize.small });

        res.modEntries.byId[entryId] = {
          ...entry,
          icon: isLeadingIconPlaceholder ? (entry.icon ?? '') : entry.icon,
          trailingIcon,
        };

        if (areLeadingIconsByGroup[entry.group]) {
          width += leadingIconColumnWidth;
        }

        if (areTrailingIconsByGroup[entry.group]) {
          width += ((typeof trailingIcon === 'string') && iconExists(trailingIcon)
            ? layout.controls.iconDimDefault
            : measureText(String(trailingIcon), { fontSize: typo.fontSize.small })
          ) + trailingIconMargin;
        }

        maxWidth = Math.max(maxWidth, width);
      }
    }

    maxWidth += (layout.controlMenus.optionPaddingLeft + layout.controlMenus.optionPaddingRight);

    res.longMenuStyle = {
      width: `${maxWidth}px`,
      height: `${(limitMenu * layout.controlMenus.optionHeight) + (space.small * 2)}px`,
    };

    res.columns = [{ width: maxWidth }];

    return res;
  }, [entries, limitMenu]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Handler for the callback prop "onClick" of the sub-component "MenuItem".
   */
  const handleClick: React.ComponentProps<typeof MenuItem>['onClick'] = ({ id: menuItemId, event }) => {
    onClick?.({ menuItemId, event });
  };


  /**
   * Handler for the prop "datasetLayout" of the layout component "DataTable" to return the required
   * dataset layout. It keeps its useCallback for the reason the menu data above states: a new
   * identity derives the whole table anew.
   */
  const getDatasetLayout = useCallback((datasetId: DatasetId) => (String(datasetId).startsWith('DIVIDER_')
    ? datasetLayouts.divider
    : datasetLayouts.menuItem
  ), []);


  /**
   * Cell iterator used at the partial dataset iterator of the data table.
   */
  const cellIterator: CellIterator = ({ datasetId }) => {
    if (String(datasetId).startsWith('DIVIDER_')) {
      return ({
        content: <Divider />,
      });
    }

    const entry = modEntries.byId[datasetId];

    return {
      justifySelf: 'stretch',
      content: (
        <MenuItem
          id={datasetId}
          disable={!!entry?.isDisabled}
          highlight={false}
          text={entry?.text ?? datasetId}
          leadingIcon={entry?.icon}
          trailingIcon={entry?.trailingIcon}
          checkBoxValue={entry?.checkBoxValue}
          onClick={handleClick}
        />
      ),
    };
  };


  /**
   * Handler for the prop "datasetPartIterator" of the layout component "DataTable".
   */
  const datasetPartIterator: DataTableProps['datasetPartIterator'] = () => ({
    cellIterator,
  });


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <span className={css.longMenu} style={longMenuStyle}>
      <DataTable
        paddingTop="small"
        paddingBottom="small"
        columns={columns}
        datasetLayout={getDatasetLayout}
        datasetIds={modEntries.allIds}
        datasetPartIterator={datasetPartIterator}
        datasetPaddingLeft={0}
        datasetPaddingRight={0}
      />
    </span>
  );
  //                                                                                  </editor-fold>
};

LongMenu.displayName = 'LongMenu';


export { LongMenu };
