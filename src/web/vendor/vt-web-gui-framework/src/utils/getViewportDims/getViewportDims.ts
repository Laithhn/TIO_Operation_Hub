/**
 * Exported function to return the width and height of the viewport with an accurancy of 1 Pixels
 * each.
 */
export const getViewportDims = (): { width: number; height: number } => ({
  width: Math.max(document.documentElement.clientWidth, window.innerWidth),
  height: Math.max(document.documentElement.clientHeight, window.innerHeight),
});
