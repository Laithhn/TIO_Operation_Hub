import { nanoid } from '@reduxjs/toolkit';
import PropTypes from 'prop-types';
import {
  memo, forwardRef, useState, useRef, useMemo, useCallback, useEffect,
} from 'react';

import useIconsAsync from 'VtWebGuiIcons/src/hooks/useIconsAsync';

import { hooks } from 'store';
import classNames from 'utils/classNames';
import getViewportDims from 'utils/getViewportDims';
import { getType } from 'utils/type';

import Divider from '../divider';
import MenuItem from '../menuItem';
import propTypeEntry from '../propTypeEntry';
import css from './shortMenu.scss';


/**
 *
 */
const ShortMenu = memo(forwardRef(({ id, entries, onClickMenuItem }, ref) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = hooks.useI18n();

  const [show, setShow] = useState(false);
  const [showSubmenu, setShowSubmenu] = useState(null);

  const clickedMenuItemRef = useRef();


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const isLevelZeroShortMenu = !ref?.current;
  const { iconExists } = useIconsAsync();

  const { entriesById, allEntryIds } = useMemo(() => {
    const areLeadingIconsByGroup = {};
    const areTrailingIconsByGroup = {};
    let byId = {},
      group = 0;

    const allIds = entries.filter((entry) => (entry?.hidden !== true)).map((entry) => {
      // Check if there is a divider. Entries between dividers are internally grouped together.
      if (getType(entry) !== 'object') {
        const dividerId = nanoid();
        byId[dividerId] = null;
        group++;
        return dividerId;
      }

      if (((typeof entry.id !== 'string') || (entry.id === '')) && (typeof entry.id !== 'number')) {
        throw new Error('VIWGF/Components/Controls > Menu/ShortMenu: there is a menu entry with an invalid ID.');
      }

      if (((typeof entry.text !== 'string') || (entry.text === '')) && (typeof entry.text !== 'number')) {
        throw new Error(`VIWGF/Components/Controls > Menu/ShortMenu: no valid text is given for the menu entry with ID "${entry.id}".`);
      }

      const areSubEntries = Array.isArray(entry.subEntries) && (entry.subEntries.length > 0);
      // there can only be a checkbox, if the entry has no sub-entries
      const modIsCheckbox = entry.isCheckbox && !areSubEntries;
      // there can only be a real leading icon, if given and valid and if the entry is not a checkbox
      const isIcon = !modIsCheckbox && iconExists(entry.icon);
      // a trailing icon con only be shown, if the entry has no sub-entries
      const isTrailingIcon = !areSubEntries && (
        ((typeof entry.trailingIcon === 'string') && (entry.trailingIcon !== ''))
        || (typeof entry.trailingIcon === 'number')
      );

      if (!areLeadingIconsByGroup[group]) {
        areLeadingIconsByGroup[group] = isIcon || modIsCheckbox; // note: a checkbox needs space like a leading icon too
      }

      if (!areTrailingIconsByGroup[group]) {
        areTrailingIconsByGroup[group] = isTrailingIcon || areSubEntries;
      }

      byId[entry.id] = {
        id: entry.id,
        group,
        disabled: !!entry.disabled,
        text: entry.text,
        ...(isIcon && { icon: entry.icon }),
        ...(isTrailingIcon && { trailingIcon: entry.trailingIcon }),
        ...(areSubEntries && {
          trailingIcon: isRtl ? 'NAVILEFT' : 'NAVIRIGHT',
          subEntries: entry.subEntries,
        }),
        ...(modIsCheckbox && {
          isCheckbox: true,
          checkboxValue: entry.checkboxValue,
        }),
      };

      return entry.id;
    }).map((entryId) => {
      const entry = byId[entryId];

      if (entry !== null) {
        byId = {
          ...byId,
          [entryId]: {
            ...entry,
            ...(areLeadingIconsByGroup[entry.group] && !entry.isCheckbox && { icon: entry.icon ?? '' }),
            ...(areTrailingIconsByGroup[entry.group] && { trailingIcon: entry.trailingIcon ?? '' }),
          },
        };
      }

      return entryId;
    });

    return {
      entriesById: byId,
      allEntryIds: allIds,
    };
  }, [entries, isRtl, iconExists]);


  const shortMenuStyle = useMemo(() => {
    if (isLevelZeroShortMenu) {
      return null;
    }

    const { width: viewportWidth, height: viewportHeight } = getViewportDims();
    const dims = ref.current.getBoundingClientRect();

    const anchorLeft = Math.round(dims.left);
    const anchorRight = Math.round(dims.right);
    const anchorTop = Math.round(dims.top);
    const anchorBottom = Math.round(dims.bottom);

    const rightwards = ((viewportWidth - anchorRight) > anchorLeft);
    const upwards = (anchorTop > (viewportHeight - anchorBottom));

    return {
      ...(rightwards
        ? { left: `${anchorRight - 1}px` }
        : { right: `${viewportWidth - anchorLeft - 1}px` }),
      ...(upwards
        ? { bottom: `${viewportHeight - anchorBottom - 12}px` }
        : { top: `${anchorTop - 12}px` }),
    };
  }, [ref, isLevelZeroShortMenu]);


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
  const handleClickMenuItem = useCallback((itemId, menuItemRef, event) => {
    if (entriesById[itemId]?.subEntries) {
      setShowSubmenu(() => {
        clickedMenuItemRef.current = menuItemRef.current;
        return itemId;
      });
    } else {
      setShowSubmenu(null);
      onClickMenuItem(id, itemId, menuItemRef, event);
    }
  }, [id, onClickMenuItem, entriesById]);


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    setShow(true);
  }, []);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const shortMenuClasses = classNames(css.shortMenu, {
    [css.show]: show,
    [css.levelZero]: isLevelZeroShortMenu,
  });

  return (
    <span
      className={shortMenuClasses}
      {...(shortMenuStyle && { style: shortMenuStyle })}
    >
      {allEntryIds.map((entryId) => {
        const entry = entriesById[entryId];

        if (entry === null) {
          return <Divider key={entryId} />;
        }

        return (
          <MenuItem
            key={entry.id}
            id={entry.id}
            disabled={entry.disabled}
            highlighted={entry.id === showSubmenu}
            text={entry.text}
            leadingIcon={entry.icon}
            trailingIcon={entry.trailingIcon}
            isCheckbox={entry.isCheckbox}
            checkboxValue={entry.checkboxValue}
            onClick={handleClickMenuItem}
          />
        );
      })}
      {(showSubmenu !== null) && (
        <ShortMenu
          ref={clickedMenuItemRef}
          id={id}
          entries={entriesById[showSubmenu].subEntries}
          onClickMenuItem={onClickMenuItem}
        />
      )}
    </span>
  );
  //                                                                                  </editor-fold>
}));

ShortMenu.displayName = 'ShortMenu';

ShortMenu.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  entries: PropTypes.arrayOf(propTypeEntry),
  anchorElemRef: PropTypes.object,
  onClickMenuItem: PropTypes.func,
};

ShortMenu.defaultProps = {
  id: '',
  entries: [],
  anchorElemRef: null,
  onClickMenuItem() {},
};

export default ShortMenu;
