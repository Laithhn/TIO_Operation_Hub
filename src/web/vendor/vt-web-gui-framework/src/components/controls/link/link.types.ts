import type { ContentData } from 'app/modules/content';


export type ToAsFunc = (event: React.MouseEvent, contentData: ContentData | undefined) => void;


/** The props of the React component of the control component "Link". */
export type LinkProps = React.PropsWithChildren<{
  /** The internal or external destination of the link or a function that is called when the link is
   * clicked. An internal destination given as a menu node ID renders as an error if no such node
   * exists, and as plain text if the node or one of its parents is hidden or disabled. */
  readonly to: string | ToAsFunc;
  /** If additional data is to be passed to the contents of internal links, this data can be passed
   * as an object of this prop. It can then be accessed within the contents via the "contentData"
   * field of the React context "ContentContext". If the target of the link is a function, its
   * content data is passed as a second argument after the event object. */
  readonly contentData?: ContentData;
}>;
