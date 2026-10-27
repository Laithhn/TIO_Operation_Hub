import type { SelectBoxProps } from 'components/controls/selectBox';

import type { EntryProps } from './entry/entry.types';


/* The props of the React sub-component "Breadcrumbs" of the layout component "MainToolbar". **/
export interface BreadcrumbsProps {
  /** List of the breadcrumb entries to display one after another, separated by dividers. Each entry
   * either can have a text and / or icon and can be clickable. Or an entry can consist of a
   * control component "SelectBbox" with several options to select. */
  readonly entries?: {
    /** The mandatory and unique ID of the entry. */
    readonly id: string;
    /** Set this field to true, to hide the entry, so it will not be displayed. */
    readonly isHidden?: boolean;
    /** Set this field to true to disable the entry. This means that no options can be selected if
     * there are any (see field "options"), nor can the entry be clicked if it is a clickable
     * one. */
    readonly isDisabled?: boolean;
    /** If this is an entry with selectable options (see field "options"), this field is the value
     * of the currently selected option. Otherwise it is the optional text of the entry, that can be
     * displayed together with an icon (see field "icon"), but one of it, text or icon must be given
     * in this case. */
    readonly value?: string | number | null;
    /** The optional icon of an entry. It can be displayed together with a text (see field "value"),
     * but one of it, text or icon must be given. If the entry has selectable options (see field
     * "options"), this field will not be considered. */
    readonly icon?: string;
    /** Optionally the entry can display a control component "SelectBox" with selectable options
     * instead of a text and / or an icon. */
    readonly options?: NonNullable<SelectBoxProps<string | number>['options']>;
  }[];
  /** Usually, the last entry in the list is not clickable. Setting this prop to true, it will also
   * be clickable. */
  readonly lastEntryClickable?: boolean;
  /** This callback prop is called either if a selectable option (see field "options" of prop
   * "entries") of an entry is selected by the user, or if an entry with text and / or icon is
   * clicked. */
  readonly onSelect?: NonNullable<EntryProps['onSelect']>;
}
