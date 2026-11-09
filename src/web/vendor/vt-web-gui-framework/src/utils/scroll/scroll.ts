import type { ScrollOptions } from './scroll.types';


const easingFuncs = {
  linear: (t: number): number => t,
  easeInQuad: (t: number): number => (t ** 2),
  easeOutQuad: (t: number): number => (t * (2 - t)),
  easeInOutQuad: (t: number): number => ((t < 0.5)
    ? (t * t * 2)
    : (-1 + (t * (4 - (t * 2))))
  ),
  easeInCubic: (t: number): number => (t ** 3),
  easeOutCubic: (t: number): number => (((t - 1) ** 3) + 1),
  easeInOutCubic: (t: number): number => ((t < 0.5)
    ? (4 * (t ** 3))
    : (((t - 1) * (((2 * t) - 2) ** 2)) + 1)
  ),
  easeInQuart: (t: number): number => (t ** 4),
  easeOutQuart: (t: number): number => (1 - ((t - 1) ** 4)),
  easeInOutQuart: (t: number): number => ((t < 0.5)
    ? (8 * (t ** 4))
    : (1 - (8 * ((t - 1) ** 4)))
  ),
  easeInQuint: (t: number): number => (t ** 5),
  easeOutQuint: (t: number): number => (1 + ((t - 1) ** 5)),
  easeInOutQuint: (t: number): number => ((t < 0.5)
    ? (16 * (t ** 5))
    : (1 + (16 * ((t - 1) ** 5)))
  ),
};


// Determine the browser dependent horizontal scroll type once, if the reading direction is
// right-to-left. If the reading direction is left-to-right, horizontal scrolling always start on
// the left side with value 0 and increases while scrolling to the right side. Example for this case
// for a scrollLeft value for a scroll way (scrollWidth - clientWidth) of 100:
//   0 >>> 100 (initial: 0)
// But if the reading direction is right-to-left, horizontal scrolling starts on the right side with
// different values and increases or decreases while scrolling to the left side. Examples for these
// values of scrollLeft for a scroll way (scrollWidth - clientWidth) of 100:
//   default:     0 <<< 100 (initial: 100)
//   negative: -100 <<<   0 (initial: 0)
//   reverse:   100 <<<   0 (initial: 0)
const rtlScrollType = (() => {
  let type = 'reverse';
  const contr = document.getElementById(process.env['ELEM_ID_TEMP'] ?? '');

  if (!contr) {
    throw new Error('VIWGF/components/helpers > Scrolling > rtlScrollType(): there is no temporary container element defined as process.env.ELEM_ID_TEMP.');
  }

  const template = document.createElement('template');
  template.innerHTML = '<div id="viUtilsAnimation" dir="rtl" style="position: fixed; left: 0; width: 1px; top: 0; height: 1px; visibility: hidden; overflow: hidden;"><div style="width: 2px;"><span style="width: 1px; display: inline-block;"></span><span style="width: 1px; display: inline-block;"></span></div></div>';

  const elemForTest = template.content.firstChild as HTMLDivElement;

  contr.appendChild(elemForTest);

  if (elemForTest.scrollLeft > 0) {
    type = 'default';
  } else {
    ((elemForTest.children[0] as HTMLDivElement).children[1] as HTMLSpanElement).scrollIntoView();
    if (elemForTest.scrollLeft < 0) {
      type = 'negative';
    }
  }

  contr.removeChild(elemForTest);

  return type;
})();


/**
 *
 */
const getSemaphore = (element: HTMLElement, dirIsLeft: boolean): number => ((dirIsLeft)
  ? Number(element.dataset['scrollSemaphLeft'])
  : Number(element.dataset['scrollSemaphTop'])
) || 0;


/**
 *
 */
const getScrollDiff = (element: HTMLElement, dirIsLeft: boolean): number => ((dirIsLeft)
  ? Number(element.dataset['scrollDiffLeft'])
  : Number(element.dataset['scrollDiffTop'])
) || 0;


/**
 *
 */
const setSemaphore = (element: HTMLElement, dirIsLeft: boolean, value: number): void => {
  if (dirIsLeft) {
    element.dataset['scrollSemaphLeft'] = String(value);
  } else {
    element.dataset['scrollSemaphTop'] = String(value);
  }
};


/**
 *
 */
const setScrollDiff = (element: HTMLElement, dirIsLeft: boolean, value: number): void => {
  if (dirIsLeft) {
    element.dataset['scrollDiffLeft'] = String(value);
  } else {
    element.dataset['scrollDiffTop'] = String(value);
  }
};


/**
 *
 */
const clearSemaphoreAndScrollDiff = (element: HTMLElement, dirIsLeft: boolean): void => {
  if (dirIsLeft) {
    delete element.dataset['scrollSemaphLeft'];
    delete element.dataset['scrollDiffLeft'];
  } else {
    delete element.dataset['scrollSemaphTop'];
    delete element.dataset['scrollDiffTop'];
  }
};


/**
 * Exported function to convert a normalized value of scrollLeft to the browser dependent value, or
 * otherwise. The normalized value always starts at 0 and decreases while scrolling.
 *
 * @param clientWidth - The value of clientWidth of the scroll container in pixels.
 * @param scrollWidth - The value of scrollWidth of the scroll container in pixels.
 * @param scrollLeft - The scroll value of scrollLeft in pixels.
 * @param isRtl - True, if the reading direction is right-to-left.
 */
const convertScrollLeft = (clientWidth: number, scrollWidth: number, scrollLeft: number, isRtl: boolean): number => {
  if (!isRtl) {
    return scrollLeft;
  }

  switch (rtlScrollType) {
    case 'negative': return -scrollLeft;
    case 'reverse': return scrollLeft;
    default: return scrollWidth - clientWidth - scrollLeft;
  }
};


/**
 * Exported function to convert a normalized value of scrollLeft to the browser dependent value, or
 * otherwise. The normalized value always starts at 0 and decreases while scrolling.
 *
 * @param element - The HTML element to scroll.
 * @param isRtl - True, if the reading direction is right-to-left.
 */
const convertScrollLeftOfElement = (element: HTMLElement, isRtl: boolean): number => convertScrollLeft(
  element.clientWidth,
  element.scrollWidth,
  element.scrollLeft,
  isRtl,
);


/**
 * Helper function to scroll an element vertical or horizontal to a given position or for a given
 * difference with easing animation.
 *
 * @param dir - The scolling direction: "top" or "left".
 * @param element - The HTML element to scroll.
 * @param to - The absolute or the difference scroll value in pixels to scroll to.
 */
const scroll = (dir: 'top' | 'left', element: HTMLElement, to: number, {
  isDiff = false, isRtl = false, duration = 200, easing = 'linear', callback,
}: ScrollOptions = {
  isDiff: false, isRtl: false, duration: 200, easing: 'linear',
}): void => {
  const easingFunc = easingFuncs[easing];

  const dirIsLeft = (dir !== 'top');
  const {
    clientWidth, clientHeight, scrollWidth, scrollHeight,
  } = element;
  const totalDiff = dirIsLeft ? (scrollWidth - clientWidth) : (scrollHeight - clientHeight);
  const startPosition = dirIsLeft ? convertScrollLeftOfElement(element, isRtl) : element.scrollTop;
  const semaph = getSemaphore(element, dirIsLeft) + 1;
  let animationFrame: number,
    prevSemaph: number,
    timestampFrom: number,
    timestampUntil: number,
    positionFrom: number,
    positionUntil: number,
    position: number;

  const diff = Math.max(
    0,
    Math.min(totalDiff, to + (isDiff ? startPosition : 0)),
  ) - startPosition;

  setSemaphore(element, dirIsLeft, semaph);
  setScrollDiff(element, dirIsLeft, diff);

  if (semaph > 1) {
    // If this is a further call of an already running scroll animation, break here. The new scroll
    // diff above will be considered in the running animation.
    return;
  }


  /**
   *
   */
  const animateScroll = (timestamp: number) => {
    const actualSemaph = getSemaphore(element, dirIsLeft);

    if (typeof timestampFrom === 'undefined') {
      // initialization
      timestampFrom = timestamp;
      timestampUntil = timestamp + duration;
      positionFrom = startPosition;
      positionUntil = startPosition + getScrollDiff(element, dirIsLeft);
    } else if (prevSemaph !== actualSemaph) {
      // If a further call of the scroll function happend while this animation is still running...
      if (isDiff) {
        // If the given position to scroll to is a series of position differences, join these
        // relative differences. The timing always starts over from the beginning.
        const normTime = (timestamp - timestampFrom) / (timestampUntil - timestampFrom);

        timestampFrom = timestamp;
        timestampUntil = timestamp + duration;
        positionFrom = Math.round(positionFrom + (Math.min(1, easingFunc(normTime)) * (positionUntil - positionFrom)));
        positionUntil += getScrollDiff(element, dirIsLeft);
      } else {
        // If the given position to scroll to is a series of absolute values, only go to the newest
        // of these positions. The timing remain the same here.
        positionFrom = position;
        positionUntil = position + getScrollDiff(element, dirIsLeft);
      }
    }

    prevSemaph = actualSemaph;

    if (duration) {
      // with animation
      const normTime = (timestamp - timestampFrom) / (timestampUntil - timestampFrom);
      position = Math.round(positionFrom + (easingFunc(Math.min(1, normTime)) * (positionUntil - positionFrom)));
    } else {
      // without animation
      position = positionUntil;
    }

    if (dirIsLeft) {
      position = Math.max(0, Math.min((scrollWidth - clientWidth), position));
      element.scrollLeft = convertScrollLeft(clientWidth, scrollWidth, position, isRtl);
    } else {
      position = Math.max(0, Math.min((scrollHeight - clientHeight), position));
      element.scrollTop = position;
    }

    if (typeof callback === 'function') {
      callback();
    }

    if ((timestamp < timestampUntil) && (position >= 0) && (position <= totalDiff)) {
      animationFrame = window.requestAnimationFrame(animateScroll);
    } else {
      clearSemaphoreAndScrollDiff(element, dirIsLeft);
      window.cancelAnimationFrame(animationFrame);
    }
  };

  animationFrame = window.requestAnimationFrame(animateScroll);
};


/**
 * Exported function to scroll an element vertical to a given position with easing animation.
 *
 * @param element - The HTML element to scroll.
 * @param to - The absolute scroll value in pixels to scroll to.
 */
const scrollTopTo = (element: HTMLElement, to: number, { duration, easing, callback }: ScrollOptions = {}) => {
  scroll('top', element, to, { duration, easing, callback });
};


/**
 * Exported function to scroll an element vertical for a given difference value with easing
 * animation.
 *
 * @param element - The HTML element to scroll.
 * @param diff - The difference value in pixels to scroll.
 */
const scrollTopDiff = (element: HTMLElement, diff: number, { duration, easing, callback }: ScrollOptions = {}) => {
  scroll('top', element, diff, {
    isDiff: true, duration, easing, callback,
  });
};


/**
 * Exported function to scroll an element horizontal to a given position with easing animation.
 *
 * @param element - The HTML element to scroll.
 * @param to - The absolute scroll value in pixels to scroll to.
 */
const scrollLeftTo = (element: HTMLElement, to: number, {
  isRtl, duration, easing, callback,
}: ScrollOptions = {}) => {
  scroll('left', element, to, {
    isRtl, duration, easing, callback,
  });
};


/**
 * Exported function to scroll an element horizontal for a given difference value with easing
 * animation.
 *
 * @param element - The HTML element to scroll.
 * @param diff - The difference value in pixels to scroll.
 */
const scrollLeftDiff = (element: HTMLElement, diff: number, {
  isRtl, duration, easing, callback,
}: ScrollOptions = {}) => {
  scroll('left', element, diff, {
    isDiff: true, isRtl, duration, easing, callback,
  });
};


export {
  convertScrollLeft, convertScrollLeftOfElement, scrollLeftDiff, scrollLeftTo, scrollTopDiff,
  scrollTopTo,
};
