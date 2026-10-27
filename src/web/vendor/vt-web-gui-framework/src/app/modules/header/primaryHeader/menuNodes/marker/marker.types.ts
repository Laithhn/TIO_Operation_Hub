import type { MenuNodeId } from 'store/menus/primaryMenu';


export interface MarkerProps {
  readonly posX: number;
  readonly width: number;
  readonly menuNodeId: MenuNodeId;
  /** Set to true, to let the marker behave like a body of liquid while it travels: it stretches
   * under acceleration, thins in the middle, drags a smaller ball behind it and catches a light
   * that lags behind the movement. Without this prop the marker is the same lens as a box, slid
   * from node to node by a transition. Default: false. */
  readonly dynamicEffect?: boolean;
}
