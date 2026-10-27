import {
  useEffect, useMemo, useRef, useState,
} from 'react';

import { space } from 'assets/styles';
import { useI18n } from 'components/hooks/useI18n';
import { Card, type CardAnchorElem } from 'components/popups/card';
import { isNonEmptyStringOrNumber } from 'utils/type';

import { iconExists } from 'VtWebGuiIcons/src';

import { Divider } from '../divider/Divider';
import { borderRadiusKey } from '../menu.consts';
import type { MenuEntry, MenuItemId } from '../menu.types';
import { MenuItem } from '../menuItem/MenuItem';

import * as css from './deepMenu.scss';
import type { DeepMenuProps, ModEntries } from './deepMenu.types.ts';


// The vertical padding of a menu level, the one value deepMenu.scss states as well: a submenu's
// anchor grows by it at the top and the bottom, see the anchor below.
const paddingV = space.small;


/**
 * React sub-component of the popup component "Menu" to show menu items as well as their sub-entries
 * in nested menus. Level zero lies in the card the menu itself opens; every deeper level is a card
 * of its own, placed beside the item that opened it.
 */
const DeepMenu = ({
  entries, anchorRef, onClick,
}: DeepMenuProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isRtl } = useI18n();

  const [showSubmenu, setShowSubmenu] = useState<MenuItemId | null>(null);

  const prevsRef = useRef<{ modEntries?: ModEntries }>({});
  const menuItemsRef = useRef<Record<MenuItemId, HTMLSpanElement | null>>({});


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  // The entries prepared for rendering. Their identity is what the effect below watches to close an
  // open submenu when the entries change, so it may change with "entries" and "isRtl" only. useMemo
  // states that here; the React Compiler would keep it as well, but only as long as it compiles
  // this file, and a bail-out would pass unnoticed.
  const modEntries = useMemo<ModEntries>(() => {
    const byId: ModEntries['byId'] = {};
    const areLeadingIconsByGroup: Record<number, boolean> = {};
    const areTrailingIconsByGroup: Record<number, boolean> = {};
    let group = 0;

    for (const entry of (entries ?? []).filter((e) => (e?.isHidden !== true))) {
      if (!entry) {
        // if there is a divider: entries between dividers are grouped together
        byId[`DIVIDER_${group}`] = null;
        group++;
      } else if (isNonEmptyStringOrNumber(entry.id) && isNonEmptyStringOrNumber(entry.text)) {
        const areSubEntries = Array.isArray(entry.subEntries) && (entry.subEntries.length > 0);
        // there can only be a checkbox, if the entry has no sub-entries
        const isCheckBox = (entry.checkBoxValue !== undefined) && !areSubEntries;
        // there can only be a real leading icon, if given and valid and if the entry is not a
        // checkbox
        const isRealLeadingIcon = !isCheckBox && iconExists(entry.icon);
        // a trailing icon con only be shown, if the entry has no sub-entries
        const isTrailingIcon = !areSubEntries && isNonEmptyStringOrNumber(entry.trailingIcon);

        // note: a checkbox needs space like a leading icon too
        if (!areLeadingIconsByGroup[group]) {
          areLeadingIconsByGroup[group] = isRealLeadingIcon || isCheckBox;
        }

        if (!areTrailingIconsByGroup[group]) {
          areTrailingIconsByGroup[group] = isTrailingIcon || areSubEntries;
        }

        byId[entry.id] = {
          id: entry.id,
          group,
          isDisabled: !!entry.isDisabled,
          text: entry.text,
          icon: isRealLeadingIcon ? entry.icon : undefined,
          ...(areSubEntries
            ? {
              trailingIcon: isRtl ? 'NAVILEFT' : 'NAVIRIGHT',
            }
            : {
              trailingIcon: isTrailingIcon ? entry.trailingIcon : undefined,
            }),
          subEntries: areSubEntries ? entry.subEntries as [MenuEntry, ...MenuEntry[]] : undefined,
          checkBoxValue: isCheckBox ? entry.checkBoxValue : undefined,
        };
      }
    }

    const allIds = Object.keys(byId);


    for (const entryId of allIds) {
      const entry = byId[entryId];

      if (entry) {
        const isLeadingIconPlaceholder = areLeadingIconsByGroup[entry.group] && (entry.checkBoxValue === undefined);

        byId[entryId] = {
          ...entry,
          icon: isLeadingIconPlaceholder ? (entry.icon ?? '') : entry.icon,
          trailingIcon: areTrailingIconsByGroup[entry.group] ? (entry.trailingIcon ?? '') : entry.trailingIcon,
        };
      }
    }

    return { byId, allIds };
  }, [entries, isRtl]);

  // The anchor of the open submenu's card. The card places itself beside an anchor flush with its
  // top edge, or with its bottom edge where the room above is larger - and flush with the item is
  // not where the entries belong: the first entry has to stand level with the item that opened
  // it, as every desktop menu has it, and the level's own padding would push it below. So the
  // anchor the card sees is the item grown by that padding at the top and the bottom; the card
  // lands flush with the grown box, and its first or its last entry lands level with the item. The
  // item is read when the card asks, from its effects, rather than while rendering - which is why
  // the anchor is a function over the items' ref and not the element itself - and read anew on
  // every call, so the card's own watch on its anchor keeps seeing the item move.
  const subAnchorRef: React.RefObject<CardAnchorElem | null> = {
    current: (showSubmenu === null)
      ? null
      : {
        getBoundingClientRect: () => {
          const rect = menuItemsRef.current[showSubmenu]?.getBoundingClientRect();

          return rect
            && new DOMRect(rect.x, rect.y - paddingV, rect.width, rect.height + (2 * paddingV));
        },
      },
  };


  //                                                                                  </editor-fold>
  // ----------------------------------------------------------<editor-fold desc="Helper Functions">
  // Helper Functions
  // -----------------------------------------------------------------------------------------------


  //                                                                                  </editor-fold>
  // ------------------------------------------------------------<editor-fold desc="Event Handlers">
  // Event Handlers
  // -----------------------------------------------------------------------------------------------

  /**
   * React callback reference of the menu items that have sub-entries to observe and store their
   * dimensions.
   */
  const menuItemRefCallback: (menuItemId: MenuItemId, node: HTMLSpanElement | null) => (undefined | (() => void)) = (menuItemId, node) => {
    if (!node) {
      return undefined;
    }

    menuItemsRef.current[menuItemId] = node;

    return () => {
      menuItemsRef.current[menuItemId] = null;
    };
  };


  /**
   * Handler for the callback prop "onClick" of the sub-component "MenuItem".
   */
  const handleClickMenuItem: React.ComponentProps<typeof MenuItem>['onClick'] = ({ id: menuItemId, event }) => {
    if (modEntries.byId[menuItemId]?.subEntries) {
      setShowSubmenu(menuItemId);
    } else {
      setShowSubmenu(null);
      onClick?.({ menuItemId, event });
    }
  };


  //                                                                                  </editor-fold>
  // -------------------------------------------------------------------<editor-fold desc="Effects">
  // Effects
  // -----------------------------------------------------------------------------------------------

  useEffect(() => {
    if (modEntries !== prevsRef.current.modEntries) {
      setShowSubmenu(null);
      prevsRef.current.modEntries = modEntries;
    }
  }, [modEntries]);


  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  const level = (
    <span className={css.deepMenu}>
      {modEntries.allIds.map((entryId) => {
        const entry = modEntries.byId[entryId];

        if (!entry) {
          return <Divider key={entryId} />;
        }

        return (
          <MenuItem
            key={entry.id}
            {...(entry.subEntries && {
              ref: (node) => menuItemRefCallback(entry.id, node),
            })}
            id={entry.id}
            disable={entry.isDisabled}
            highlight={entry.id === showSubmenu}
            text={entry.text}
            leadingIcon={entry.icon}
            trailingIcon={entry.trailingIcon}
            checkBoxValue={entry.checkBoxValue}
            onClick={handleClickMenuItem}
          />
        );
      })}
      {(showSubmenu !== null) && modEntries.byId[showSubmenu]?.subEntries && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
        <DeepMenu entries={modEntries.byId[showSubmenu].subEntries} anchorRef={subAnchorRef} {...(onClick && { onClick })} />
      )}
    </span>
  );

  if (!anchorRef) {
    return level;
  }

  // A submenu is a card of its own, the same card the menu opens for level zero, so it carries the
  // same glass, the same rounding and the same shadow, and the card places it beside its anchor
  // wherever the viewport leaves room. Until 2026-09-04 a submenu was a fixed-positioned span
  // inside the parent's card, with a flat background of its own. That broke the day the card
  // became glass: a backdrop-filter makes its element the containing block of every fixed
  // descendant, so the viewport coordinates the span computed were applied inside the card, and
  // the submenu stood displaced by the card's own offset. The card closes with the menu; a click on
  // another item switches the submenu, and one on an entry closes everything, so it needs no
  // closing of its own.
  return (
    <Card
      {...(borderRadiusKey && { borderRadius: borderRadiusKey })}
      anchorElemRef={anchorRef}
      placeBesideAnchorElem
    >
      {level}
    </Card>
  );
  //                                                                                  </editor-fold>
};

DeepMenu.displayName = 'DeepMenu';


export { DeepMenu };
