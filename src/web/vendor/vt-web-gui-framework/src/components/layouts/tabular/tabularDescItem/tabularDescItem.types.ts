import type { TabularItemInjectedProps } from '../tabular.types';


/**
 * The props of the React sub-component "TabularDescItem" of the layout component "Tabular". A
 * description item carries no surface of its own at either style, so the tabular passes it neither a
 * background colour nor a border radius. Of the spacings it takes the horizontal pair, and only at
 * the style "background", where it lines its text up with the items beside it; its vertical spacing
 * is its own, being smaller than an entry's.
 */
export interface TabularDescItemProps extends Pick<TabularItemInjectedProps, 'tabularStyle' | 'paddingRight' | 'paddingLeft'> {
  /** Setting this prop to true adds a larger spacing above the description. */
  readonly spaceBefore?: boolean;
  /** Setting this prop to true adds a larger spacing below the description. */
  readonly spaceAfter?: boolean;
  /** The content of the tabular description item, usually a describing text. */
  readonly children?: React.ReactNode;
}
