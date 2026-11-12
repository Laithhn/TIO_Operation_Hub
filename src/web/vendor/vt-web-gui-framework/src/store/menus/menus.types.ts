export type MenuNodeId = string;


/** The scope of a content: "main" means, that the content is a React component and has to be opened
 * in the main scope of the app. At scope "modwin", the content is a React component, too, but has
 * to be opened in a modal window. If the content scope is "js", the content is a JavaScript
 * function that has to be executed. "blank" means, that the content is a URL to open in a new
 * browser tab or window. */
export type ContentScope = 'main' | 'modwin' | 'js' | 'blank';


export type MenuNodeOptions = Record<string, string | number | boolean | null>;


export interface MenuNode {
  /** The mandatory and unique ID of the primary or secondary menu node. */
  id: MenuNodeId;
  /** The caption of the primary or secondary menu node. It is mandatory for primary menu nodes,
   * unless there is only one primary menu node. For secondary menu nodes it is mandatory except for
   * special menu nodes. */
  caption: string | null;
  /** The menu node level of the menu tree, starts counting with 1 for the highest level menu
   * nodes. */
  level: number;
  /** The name of the icon of the primary or secondary menu node. It is mandatory for primary menu
   * nodes of the 1st and 2nd level (exception: there is only one primary menu node). It is
   * mandatory for secondary menu nodes of the 1st level (except for special menu nodes). */
  icon: string | null;
  /** True, if the primary or secondary menu node is invisible. */
  isHidden: boolean;
  /** True, if the primary or secondary menu node is visible, but can not selected and clicked. */
  isDisabled: boolean;
  /** The optional path to the content of the primary or secondary menu node. It is either a
   * relative path in the content directory, or a relative path to a JavaScripe file (secondary menu
   * nodes only), or an URL of a web page to embed in an iframe or to open in a new browser tab. */
  contentPath: string;
  /** An array with the IDs of this and all of its parent menu nodes, starting with the parent menu
   * node of the 1st level. */
  menuNodeTree: MenuNodeId[];
  /** If the primary or secondary menu node has a submenu, then this is an array with the IDs of the
   * submenu nodes. */
  submenuNodeIds: MenuNodeId[];
}


export interface AddSubmenuNode {
  /** The mandatory and unique ID of the new primary or secondary (sub-)menu node. */
  id: MenuNodeId;
  /** The caption of the primary or secondary submenu node. It is mandatory for all primary and
   * secondary submenu nodes. */
  caption: string;
  /** The name of the icon of the primary or secondary (sub-)menu node. It is mandatory for primary
   * menu nodes of the 1st and 2nd level (exception: there is only one primary menu node). It is
   * mandatory for secondary menu nodes of the 1st level (except for special menu nodes). */
  icon?: string;
  /** True, if the primary or secondary (sub-)menu node is invisible. */
  isHidden?: boolean;
  /** True, if the primary or secondary (sub-)menu node is visible, but can not selected and
   * clicked. */
  isDisabled?: boolean;
  /** The scope for the content of the secondary (sub-)menu node. It can by "MODWIN", "JS" or
   * "BLANK". */
  scope?: ContentScope;
  /** The part of the URL path between the slashes, that belongs of the URL to select the primary
   * (sub-)menu node. It is mandatory for all primary (sub-)menu nodes. */
  urlPathPart?: string;
  /** The optional path to the content of the primary or secondary (sub-)menu node. It is either a
   * relative path in the content directory, or a relative path to a JavaScripe file (secondary menu
   * nodes only), or an URL of a web page to embed in an iframe or to open in a new browser tab. */
  contentPath?: string;
  /** If the primary or secondary (sub-)menu node has a submenu, then this is an array with the IDs
   * of the submenu nodes. */
  submenuNodes?: AddSubmenuNode[];
  /** An optional object with options of the primary or secondary (sub-)menu node. */
  options?: MenuNodeOptions;
}


export interface AddMenuNode extends Omit<AddSubmenuNode, 'caption'> {
  /** The caption of the primary or secondary menu node. It is mandatory for primary menu nodes,
   * unless there is only one primary menu node. For secondary menu nodes it is mandatory except for
   * special menu nodes. */
  caption?: string;
  /** If the new primary or secondary menu node is to be inserted below another node, set this
   * optional parameter to the ID of the parent menu node. The parent menu node must already exist
   * or inserted before. */
  parentMenuNodeId?: MenuNodeId;
  /** Optionally an ID of a primary or secondary sibling menu node before which the new menu node is
   * to be inserted. If not set, the new menu node is inserted at the end. */
  insertBeforeId?: MenuNodeId;
  /** Secondary menu nodes of the 1st level only: set to true to always show this menu node in the
   * default way, independent of the appearance of the menus. */
  ignoreAppearance?: boolean;
}


export interface ModifyMenuNode {
  id: MenuNodeId;
  caption?: string;
  icon?: string;
}
