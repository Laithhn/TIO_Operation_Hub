/**
 * Exported function to round a given value to a certain number of digits. If the number of digits
 * is negative, the value is rounded before the comma.
 *
 * @param {number} value - The value to round.
 * @param {number} digits - The number of digits to round to.
 * @returns {number}
 */
export const round = (value, digits) => Math.round(value * (10 ** digits)) / (10 ** digits);


/**
 * Exported function to convert an angle in degree into a radiant angle.
 *
 * @param {number} deg - The angle in degree.
 * @returns {number}
 */
export const deg2rad = (deg) => deg * Math.PI / 180;


/**
 * Exported function to convert a radiant angle into an angle in degree.
 *
 * @param {number} rad - The radiant angle.
 * @returns {number}
 */
export const rad2deg = (rad) => rad * 180 / Math.PI;


/**
 * Exported function to convert the given polar coordinates into cartesian coordinates.
 *
 * @param {number} x - The cartesian origin of the polar coordinates in direction x.
 * @param {number} y - The cartesian origin of the polar coordinates in direction y.
 * @param {number} radius - The radius value of the polar coordinates.
 * @param {number} angleDeg - The angle in degree of the polar coordintes, starting with 0 at the
 *   3 o'clock position, runs counterclockwise.
 */
export const polarToCartesian = (x, y, radius, angleDeg) => {
  const angleRad = deg2rad(angleDeg);

  return {
    x: x + (radius * Math.cos(angleRad)),
    y: y + (radius * Math.sin(angleRad)),
  };
};
