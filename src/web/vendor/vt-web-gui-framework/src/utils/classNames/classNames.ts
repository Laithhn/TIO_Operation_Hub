import type { ClassNamesObject, ClassNamesParams } from './classNames.types';


const isClassNamesObject = (value: unknown): value is ClassNamesObject => (
  Object.prototype.toString.call(value as ClassNamesObject) === '[object Object]'
);


/**
 * Exported function to join CSS class names to one string. Class names can be given as strings, as
 * keys of objects with truthy / falsy values (to indicate if the class has to be taken or not), or
 * as arrays (function classNames will be called recursively in this case).
 *
 * @returns All class names seperated by blanks.
 *
 * @example
 * ```typescript
 * classNames('myCssClass', {
 *   'funny-class': (i > 5),
 *   otherCssClass: useOtherCssClass,
 * });
 * ```
  */
export const classNames = (...args: ClassNamesParams): string => {
  const classes: string[] = [];

  args.forEach((arg) => {
    if ((typeof arg === 'string') && (arg !== '')) {
      classes.push(arg);
    } else if (Array.isArray(arg) && arg.length) {
      classes.push(classNames(arg));
    } else if (isClassNamesObject(arg)) {
      classes.push(...Object.keys(arg).filter((key) => arg[key]));
    }
  });

  return classes.join(' ');
};
