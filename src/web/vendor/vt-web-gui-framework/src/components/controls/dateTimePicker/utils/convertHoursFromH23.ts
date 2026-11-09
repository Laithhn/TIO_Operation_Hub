/**
 * Function to convert a given 24-hour based hours value (0 - 23) into the given hour cycle: "h12"
 * runs from 1 to 12, "h23" is the given value as it is.
 */
export const convertHoursFromH23 = (hours: number | null, hourCycle: 'h12' | 'h23'): (number | null) => {
  if (hourCycle === 'h12') {
    if (hours === 0) {
      return 12;
    }

    if ((hours === null) || (hours <= 12)) {
      return hours;
    }

    return (hours - 12);
  }

  return hours;
};
