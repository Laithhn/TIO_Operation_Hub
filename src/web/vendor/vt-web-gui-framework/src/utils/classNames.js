/**
 * Exported function to join CSS class names to one string. The class names are seperated by blanks.
 *
 * @returns {string}
 */
const classNames = (...args) => {
  const classes = [];

  args.forEach((arg) => {
    if ((typeof arg === 'string') && (arg !== '')) {
      classes.push(arg);
    } else if (Array.isArray(arg) && arg.length) {
      classes.push(classNames(arg));
    } else if (Object.prototype.toString.call(arg) === '[object Object]') {
      classes.push(...Object.keys(arg).filter((key) => arg[key]));
    }
  });

  return classes.join(' ');
};

export default classNames;
