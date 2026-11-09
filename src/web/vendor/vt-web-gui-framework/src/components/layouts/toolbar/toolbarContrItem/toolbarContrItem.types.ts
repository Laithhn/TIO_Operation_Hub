import type { StylingPropCollection } from 'components/hooks/useStylingProps';


export const toolbarContrItemStylingProps = [
  'justifySelf',
  'visible',
  'gridTemplateRows',
  'gridTemplateColumns',
  'gridTemplateAreas',
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

export type ToolbarContrItemStylingProps = Pick<StylingPropCollection, (typeof toolbarContrItemStylingProps)[number]>;


/** The props of the React sub-component "ToolbarContrItem" of the layout component "Toolbar". */
export type ToolbarContrItemProps = React.PropsWithChildren<{
  /** Optionally, an ID for the HTML attribute "id" of the toolbar container, written in every
   * build - for example to find it in automated tests, or to render into it through a React
   * portal:
   * @example
   * ```typescript
   * document.getElementById('myId')
   * ```
   * It has to be unique in the whole document, and IDs starting with "viwgf_" are reserved for the
   * framework. */
  readonly id?: string;
} & ToolbarContrItemStylingProps>;
