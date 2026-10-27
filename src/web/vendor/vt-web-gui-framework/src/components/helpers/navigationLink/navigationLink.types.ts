import type { ContentData } from 'app/modules/content';


/** The props of the React component of the helper component "NavigationLink". */
export type NavigationLinkProps = React.PropsWithChildren<{
  /** The React reference of the outer element of the navigation link component:
   * @example
   * ```typescript
   * return (
   *   <Link ref={ref}>...</Link>
   * );
   * ``` */
  readonly ref?: React.Ref<HTMLAnchorElement | null>;
  /** Optionally, an ID for the HTML attribute "id" of the link element, written in every build -
   * for example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  /** This prop can be passed an object containing CSS styling properties. These are then assigned
   * as inline styles to the outer HTML element of the navigation link component. */
  readonly className?: string;
  /** The destination path of the link, optionally with search string and hash.  */
  readonly to: string;
  /** Prop to add persistent client side routing state to the next location. This location state is
   * accessed from location:
   * @example
   * ```typescript
   * <Link to="/somewhere" state={{ some: "value" }} />
   * ...
   * const location = useLocation();
   * const data = location.state; // { some: "value" }
   * ```  */
  readonly state?: ContentData;
  /** A callback prop that is called when the link is clicked. */
  readonly onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}>;
