import PropTypes from 'prop-types';
import { memo, useMemo, useCallback } from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import defines from 'assets/defines';
import Enums from 'assets/enums';
import DataTable from 'components/layouts/dataTable';
import measureText from 'utils/measureText';
import { getType } from 'utils/type';

import Divider from '../divider';
import MenuItem from '../menuItem';
import menuDefines from '../defines';
import propTypeEntry from '../propTypeEntry';
import css from './longMenu.scss';


// the dataset layouts for the data table
const datasetLayouts = {
  divider: {
    id: 'divider',
    rows: [{ height: (menuDefines.dividerSpace * 2) + 1, cells: ['divider'] }],
    noBottomLine: true,
  },
  menuItem: {
    id: 'menuItem',
    rows: [{ height: menuDefines.itemHeight, cells: ['menuItem'] }],
    noBottomLine: true,
  },
};


/**
 *
 */
const LongMenu = memo(({
  id, entries, limitMenu, onClickMenuItem,
}) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { iconExists } = useIconsAsync();

  const { modEntries, longMenuStyle, columns } = useMemo(() => {
    const res = {
      modEntries: {
        byId: {},
        allIds: [],
      },
      longMenuStyle: {},
      columns: [],
    };

    const areLeadingIconsByGroup = {};
    const areTrailingIconsByGroup = {};
    let group = 0,
      maxWidth = 0;

    res.modEntries.byId = entries
      .filter((entry) => (
        (entry?.hidden !== true)
        && (!Array.isArray(entry?.subEntries) || (entry.subEntries.length === 0))
      ))
      .reduce((acc, entry) => {
        // Check if there is a divider. Entries between dividers are grouped together.
        if (getType(entry) !== 'object') {
          group++;
          return {
            ...acc,
            [`DIVIDER_${group - 1}`]: null,
          };
        }

        if (((typeof entry.id !== 'string') || (entry.id === '')) && (typeof entry.id !== 'number')) {
          throw new Error('VIWGF/Components/Controls > Menu/LongMenu: there is a menu entry with an invalid ID.');
        }

        if (((typeof entry.text !== 'string') || (entry.text === '')) && (typeof entry.text !== 'number')) {
          throw new Error(`VIWGF/Components/Controls > Menu/LongMenu: no valid text is given for the menu entry with ID "${entry.id}".`);
        }

        // there can only be a real leading icon, if given and valid and if the entry is not a
        // checkbox
        const isRealLeadingIcon = !entry.isCheckbox && iconExists(entry.icon);
        const isTrailingIcon = (
          ((typeof entry.trailingIcon === 'string') && (entry.trailingIcon !== ''))
          || (typeof entry.trailingIcon === 'number')
        );

        if (!areLeadingIconsByGroup[group]) {
          areLeadingIconsByGroup[group] = isRealLeadingIcon || entry.isCheckbox; // note: a checkbox needs space like a leading icon too
        }

        if (!areTrailingIconsByGroup[group]) {
          areTrailingIconsByGroup[group] = isTrailingIcon;
        }

        return {
          ...acc,
          [entry.id]: {
            id: entry.id,
            group,
            disabled: !!entry.disabled,
            text: entry.text,
            ...(isRealLeadingIcon && { icon: entry.icon }),
            ...(isTrailingIcon && { trailingIcon: entry.trailingIcon }),
            ...(entry.isCheckbox && {
              isCheckbox: true,
              checkboxValue: entry.checkboxValue,
            }),
          },
        };
      }, {});

    res.modEntries.allIds = Object.keys(res.modEntries.byId);

    res.modEntries.allIds.forEach((entryId) => {
      const entry = res.modEntries.byId[entryId];

      if (entry !== null) {
        let width = measureText(entry.text, { fontSize: defines.typo.fontSize.small });

        if (areLeadingIconsByGroup[entry.group]) {
          if (!entry.isCheckbox) {
            entry.icon = entry.icon ?? '';
          }
          width += menuDefines.leadingIconWidth;
        }

        if (areTrailingIconsByGroup[entry.group]) {
          entry.trailingIcon = entry.trailingIcon ?? '';

          width += (iconExists(entry.trailingIcon)
            ? menuDefines.iconSize
            : measureText(entry.trailingIcon, { fontSize: defines.typo.fontSize.small })
          ) + menuDefines.trailingIconMargin;
        }

        maxWidth = Math.max(maxWidth, width);
      }
    });

    maxWidth += (menuDefines.itemPaddingLeftRight * 2);

    res.longMenuStyle = {
      width: `${maxWidth}px`,
      height: `${(limitMenu * menuDefines.itemHeight) + (defines.space.xs * 2)}px`,
    };

    res.columns = [{ width: maxWidth }];

    return res;
  }, [iconExists, entries, limitMenu]);


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  /**
   *
   */
  const handleClickMenuItem = useCallback((itemId, elemRef, event) => {
    onClickMenuItem(id, itemId, elemRef, event);
  }, [id, onClickMenuItem]);


  /**
   *
   */
  const dividerCellIterator = useCallback(() => ({
    content: <Divider />,
  }), []);


  /**
   *
   */
  const menuItemCellIterator = useCallback(({ datasetId }) => {
    const entry = modEntries.byId[datasetId];

    return {
      justifySelf: Enums.PlaceSelfItems.STRETCH,
      content: (
        <MenuItem
          id={datasetId}
          disabled={entry.disabled}
          text={entry.text}
          leadingIcon={entry.icon}
          trailingIcon={entry.trailingIcon}
          isCheckbox={entry.isCheckbox}
          checkboxValue={entry.checkboxValue}
          onClick={handleClickMenuItem}
        />
      ),
    };
  }, [handleClickMenuItem, modEntries]);


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * Memoized handler for the data table to return the required dataset layout.
   */
  const getDatasetLayout = useCallback((datasetId) => (datasetId.startsWith('DIVIDER_')
    ? datasetLayouts.divider
    : datasetLayouts.menuItem
  ), []);


  /**
   * The memoized partial dataset iterator for the data table.
   */
  const datasetPartIterator = useCallback(({ datasetId }) => ({
    cellIterator: datasetId.startsWith('DIVIDER_')
      ? dividerCellIterator
      : menuItemCellIterator,
  }), [dividerCellIterator, menuItemCellIterator]);


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
        paddingTop={Enums.GapAndPadding.SMALL}
        paddingBottom={Enums.GapAndPadding.SMALL}
        columns={columns}
        datasetLayout={getDatasetLayout}
        datasetIds={modEntries.allIds}
        datasetPartIterator={datasetPartIterator}
        datasetPaddingRight={Enums.GapAndPadding.NONE}
        datasetPaddingLeft={Enums.GapAndPadding.NONE}
      />
    </span>
  );
  //                                                                                  </editor-fold>
});

LongMenu.displayName = 'LongMenu';

LongMenu.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  entries: PropTypes.arrayOf(propTypeEntry),
  limitMenu: PropTypes.number,
  onClickMenuItem: PropTypes.func,
};

LongMenu.defaultProps = {
  id: '',
  entries: [],
  limitMenu: Infinity,
  onClickMenuItem() {},
};

export default LongMenu;
