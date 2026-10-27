import type { StylingPropCollection } from 'components/hooks/useStylingProps';

import type { TabularItemInjectedProps } from '../tabular.types';


export const tabularContrItemStylingProps = [
  'relativePosition',
  'visible',
  'gridTemplateRows',
  'gridTemplateColumns',
  'gridTemplateAreas',
  'gridAutoFlow',
  'gridAutoRows',
  'gridAutoColumns',
  'gap',
  'rowGap',
  'columnGap',
  'placeContent',
  'alignContent',
  'justifyContent',
  'placeItems',
  'alignItems',
  'justifyItems',
] as const;

export type TabularContrItemStylingProps = Pick<StylingPropCollection, (typeof tabularContrItemStylingProps)[number]>;


/**
 * The styling props of the container item plus the spacing, colour and radius props that the tabular
 * injects (see "TabularItemInjectedProps"). This is the list the component hands to the hook
 * "useStylingProps", so that the injected ones are derived like any other styling prop, mirroring
 * included for right-to-left languages. They are deliberately not part of the public styling props
 * above: which of them an item receives is the tabular's decision, made from its style.
 */
export const tabularContrItemUsedStylingProps = [
  ...tabularContrItemStylingProps,
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'backgroundColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const;


export interface TabularContrItemHandle {
  getBoundingClientRect: () => ReturnType<Element['getBoundingClientRect']> | undefined;
}


/** The props of the React sub-component "TabularContrItem" of the layout component "Tabular". */
export interface TabularContrItemProps extends TabularContrItemStylingProps, TabularItemInjectedProps {
  /** The React reference of an imperative handle of the tabular container item component. */
  readonly ref?: React.Ref<TabularContrItemHandle | null>;
  /** The content (sub-components) of the tabular container item. */
  readonly children?: React.ReactNode;
}
