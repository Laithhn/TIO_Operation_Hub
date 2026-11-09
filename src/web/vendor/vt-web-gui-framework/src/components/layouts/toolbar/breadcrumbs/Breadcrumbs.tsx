import { Fragment, useContext } from 'react';

import { ContentContext } from 'app/modules/content';
import { isNonEmptyStringOrNumber } from 'utils/type';

import { iconExists } from 'VtWebGuiIcons/src';

import * as css from './breadcrumbs.scss';
import type { BreadcrumbsProps } from './breadcrumbs.types';
import { Divider } from './divider/Divider';
import { Entry } from './entry/Entry';


/**
 * React sub-component of the breadcrumbs navigation container of the layout component
 * "MainToolbar".
 */
const Breadcrumbs = ({ entries, lastEntryClickable = false, onSelect }: BreadcrumbsProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const { isScopeModwin } = useContext(ContentContext);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  type FilteredEntries = {
    id: string;
    isDisabled: boolean;
    value: string | number | null;
    icon?: string;
    options?: NonNullable<React.ComponentProps<typeof Entry>['options']>;
  }[];

  const filteredEntries = (entries ?? [])
    .filter(({ isHidden }) => !isHidden)
    .reduce<FilteredEntries>((acc, entry) => {
      const isValue = isNonEmptyStringOrNumber(entry.value, { withoutInfinite: true });

      if (Array.isArray(entry.options)) {
        return [...acc, {
          id: entry.id,
          isDisabled: !!entry.isDisabled,
          value: isValue ? entry.value : null,
          options: entry.options,
        }];
      }

      const isIcon = iconExists(entry.icon ?? '');

      if (isValue || isIcon) {
        return [...acc, {
          id: entry.id,
          isDisabled: !!entry.isDisabled,
          value: isValue ? entry.value : null,
          ...(isIcon && { icon: entry.icon }),
        }];
      }

      return acc;
    }, []);

  const numFilteredEntries = filteredEntries.length;


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
    <div className={css.breadcrumbs}>
      {filteredEntries.map((entry, idx) => {
        const isNotLastEntry = (idx < (numFilteredEntries - 1));

        return (
          <Fragment key={entry.id}>
            {Entry({
              id: entry.id,
              disable: entry.isDisabled,
              value: entry.value,
              ...(entry.icon && { icon: entry.icon }),
              ...(entry.options && { options: entry.options }),
              ...((isNotLastEntry || lastEntryClickable) && (typeof onSelect === 'function') && { onSelect }),
            })}
            {isNotLastEntry && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
              Divider({ isScopeModwin })
            )}
          </Fragment>
        );
      })}
    </div>
  );
  //                                                                                  </editor-fold>
};

Breadcrumbs.displayName = 'Breadcrumbs';


export { Breadcrumbs };
