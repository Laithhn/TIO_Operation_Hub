/**
 * Exported function to return the viewport width and height with an accurancy of 1 Pixels each.
 *
 * @returns {{ width: number, height: number }}
 */
const getViewportDims = () => ({
  width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
  height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
});

export default getViewportDims;
