/**
 * Exported function to round and return a given value to a given certain number of digits. If the
 * number of digits is negative, the value is rounded before the comma.
 */
export const round = (value: number, digits: number): number => Math.round(value * (10 ** digits)) / (10 ** digits);


/**
 * Exported function to convert and return a given angle in degree into a radiant angle.
 */
export const deg2rad = (deg: number): number => deg * Math.PI / 180;


/**
 * Exported function to convert and return a givne radiant angle into an angle in degree.
 */
export const rad2deg = (rad: number): number => rad * 180 / Math.PI;


/**
 * Exported function to convert and return the given polar coordinates into cartesian coordinates.
 *
 * @param x - The cartesian origin of the polar coordinates in direction x.
 * @param y - The cartesian origin of the polar coordinates in direction y.
 * @param radius - The radius value of the polar coordinates.
 * @param angleDeg - The angle in degree of the polar coordintes, starting with 0 at the
 *   3 o'clock position, runs counterclockwise.
 */
export const polarToCartesian = (
  x: number, y: number, radius: number, angleDeg: number,
): { x: number; y: number } => {
  const angleRad: number = deg2rad(angleDeg);

  return {
    x: x + radius * Math.cos(angleRad),
    y: y + (radius * Math.sin(angleRad)),
  };
};
