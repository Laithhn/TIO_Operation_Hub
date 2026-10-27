const easingFuncs = {
  linear: (t) => t,
  easeInQuad: (t) => (t ** 2),
  easeOutQuad: (t) => (t * (2 - t)),
  easeInOutQuad: (t) => ((t < 0.5)
    ? (t * t * 2)
    : (-1 + (t * (4 - (t * 2))))
  ),
  easeInCubic: (t) => (t ** 3),
  easeOutCubic: (t) => (((t - 1) ** 3) + 1),
  easeInOutCubic: (t) => ((t < 0.5)
    ? (4 * (t ** 3))
    : (((t - 1) * (((2 * t) - 2) ** 2)) + 1)
  ),
  easeInQuart: (t) => (t ** 4),
  easeOutQuart: (t) => (1 - ((t - 1) ** 4)),
  easeInOutQuart: (t) => ((t < 0.5)
    ? (8 * (t ** 4))
    : (1 - (8 * ((t - 1) ** 4)))
  ),
  easeInQuint: (t) => (t ** 5),
  easeOutQuint: (t) => (1 + ((t - 1) ** 5)),
  easeInOutQuint: (t) => ((t < 0.5)
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
  const contr = document.getElementById(process.env.ELEM_ID_TEMP);

  if (!contr) {
    throw new Error('VIWGF/Components/Helpers > Scrolling > rtlScrollType(): there is no temporary container element defined as process.env.ELEM_ID_TEMP.');
  }

  const template = document.createElement('template');
  template.innerHTML = '<div id="viUtilsAnimation" dir="rtl" style="position: fixed; left: 0; width: 1px; top: 0; height: 1px; visibility: hidden; overflow: hidden;"><div style="width: 2px;"><span style="width: 1px; display: inline-block;"></span><span style="width: 1px; display: inline-block;"></span></div></div>';

  const elemForTest = template.content.firstChild;
  contr.appendChild(elemForTest);

  if (elemForTest.scrollLeft > 0) {
    type = 'default';
  } else if ((typeof Element !== 'undefined') && Element.prototype.scrollIntoView) {
    elemForTest.children[0].children[1].scrollIntoView();
    if (elemForTest.scrollLeft < 0) {
      type = 'negative';
    }
  } else {
    elemForTest.scrollLeft = 1;

    if (elemForTest.scrollLeft === 0) {
      type = 'negative';
    }
  }

  contr.removeChild(elemForTest);

  return type;
})();


/**
 *
 */
const getSemaphore = (element, dirIsLeft) => ((dirIsLeft)
  ? parseInt(element.dataset.scrollSemaphLeft ?? 0, 10)
  : parseInt(element.dataset.scrollSemaphTop ?? 0, 10)
);


/**
 *
 */
const getScrollDiff = (element, dirIsLeft) => ((dirIsLeft)
  ? parseInt(element.dataset.scrollDiffLeft ?? 0, 10)
  : parseInt(element.dataset.scrollDiffTop ?? 0, 10)
);


/**
 *
 */
const setSemaphore = (element, dirIsLeft, value) => {
  if (dirIsLeft) {
    element.dataset.scrollSemaphLeft = value;
  } else {
    element.dataset.scrollSemaphTop = value;
  }
};


/**
 *
 */
const setScrollDiff = (element, dirIsLeft, value) => {
  if (dirIsLeft) {
    element.dataset.scrollDiffLeft = value;
  } else {
    element.dataset.scrollDiffTop = value;
  }
};


/**
 *
 */
const clearSemaphoreAndScrollDiff = (element, dirIsLeft) => {
  if (dirIsLeft) {
    delete element.dataset.scrollSemaphLeft;
    delete element.dataset.scrollDiffLeft;
  } else {
    delete element.dataset.scrollSemaphTop;
    delete element.dataset.scrollDiffTop;
  }
};


/**
 * Exported function to convert a normalized value of scrollLeft to the browser dependent value, or
 * otherwise. The normalized value always starts at 0 and decreases while scrolling.
 *
 * @param {number} clientWidth - The value of clientWidth of the scroll container in pixels.
 * @param {number} scrollWidth - The value of scrollWidth of the scroll container in pixels.
 * @param {number} scrollLeft - The scroll value of scrollLeft in pixels.
 * @param {boolean} isRtl - True, if the reading direction is right-to-left.
 * @returns {number} - The converted value of scrollLeft.
 */
export const convertScrollLeft = (clientWidth, scrollWidth, scrollLeft, isRtl) => {
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
 * @param {Element} element - The HTML element to scroll.
 * @param {boolean} isRtl - True, if the reading direction is right-to-left.
 */
export const convertScrollLeftOfElement = (element, isRtl) => convertScrollLeft(
  element.clientWidth,
  element.scrollWidth,
  element.scrollLeft,
  isRtl,
);


/**
 * Helper function to scroll an element vertical or horizontal to a given position or for a given
 * difference with easing animation.
 *
 * @param {string} dir - The scolling direction: "top" or "left".
 * @param {Element} element - The HTML element to scroll.
 * @param {number} to - The absolute or the difference scroll value in pixels to scroll to.
 * @param {object} [options] - Optional options with default values.
 * @param {boolean} [options.isDiff=false] - Set to true, if parameter "to" is a difference and not
 *   an absolute value.
 * @param {boolean} [options.isRtl=false] - Set to true, if the reading direction is right-to-left.
 * @param {number} [options.duration=200] - The scrolling time in milliseconds.
 * @param {string} [options.easing="linear"] - The name of the easing function: "lienar",
 *   "easeInQuad", "easeOutQuad", "easeInOutQuad", "easeInCubic", "easeOutCubic", "easeInOutCubic",
 *   "easeInQuart", "easeOutQuart", "easeInOutQuart", "easeInQuint", "easeOutQuint" or
 *   "easeInOutQuint".
 * @param {function} [options.callback] - A callback function that is called each time, scrollTop or
 *   scrollLeft of the element was set.
 */
const scroll = (dir, element, to, {
  isDiff = false, isRtl = false, duration = 200, easing = 'linear', callback,
} = {
  isDiff: false, isRtl: false, duration: 200, easing: 'linear',
}) => {
  const easingFunc = easingFuncs[easing];

  if (typeof easingFunc !== 'function') {
    throw new Error(`VIWGF/Components/Helpers > Scrolling > scroll(): the given easing function ${easing} does not exist.`);
  }

  const dirIsLeft = (dir !== 'top');
  const {
    clientWidth, clientHeight, scrollWidth, scrollHeight,
  } = element;
  const totalDiff = dirIsLeft ? (scrollWidth - clientWidth) : (scrollHeight - clientHeight);
  const startPosition = dirIsLeft ? convertScrollLeftOfElement(element, isRtl) : element.scrollTop;
  const semaph = getSemaphore(element, dirIsLeft) + 1;
  let animationFrame, prevSemaph, timestampFrom, timestampUntil, positionFrom, positionUntil;

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
  const animateScroll = (timestamp) => {
    const actualSemaph = getSemaphore(element, dirIsLeft);
    let position;

    if (timestampFrom === undefined) {
      // initialization

      timestampFrom = timestamp;
      timestampUntil = timestamp + duration;
      positionFrom = startPosition;
      positionUntil = startPosition + getScrollDiff(element, dirIsLeft);
    } else if (prevSemaph !== actualSemaph) {
      // if a further call of the scroll function happend while this animation is still running, fit
      // the timestamp and position parameters
      const normTime = (timestamp - timestampFrom) / (timestampUntil - timestampFrom);

      timestampFrom = timestamp;
      timestampUntil = timestamp + duration;
      positionFrom = Math.round(positionFrom + (Math.min(1, easingFunc(normTime)) * (positionUntil - positionFrom)));
      positionUntil += getScrollDiff(element, dirIsLeft);
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
 * @param {Element} element - The HTML element to scroll.
 * @param {number} to - The absolute scroll value in pixels to scroll to.
 * @param {object} [options] - Optional options with default values.
 * @param {number} [options.duration=200] - The scrolling time in milliseconds.
 * @param {string} [options.easing="linear"] - The name of the easing function: "lienar",
 *   "easeInQuad", "easeOutQuad", "easeInOutQuad", "easeInCubic", "easeOutCubic", "easeInOutCubic",
 *   "easeInQuart", "easeOutQuart", "easeInOutQuart", "easeInQuint", "easeOutQuint" or
 *   "easeInOutQuint".
 * @param {function} [options.callback] - A callback function that is called each time, scrollTop of
 *   the element was set.
 */
export const scrollTopTo = (element, to, { duration = 200, easing = 'linear', callback } = { duration: 200, easing: 'linear' }) => {
  scroll('top', element, to, { duration, easing, callback });
};


/**
 * Exported function to scroll an element vertical for a given difference value with easing
 * animation.
 *
 * @param {Element} element - The HTML element to scroll.
 * @param {number} diff - The difference value in pixels to scroll.
 * @param {object} [options] - Optional options with default values.
 * @param {number} [options.duration=200] - The scrolling time in milliseconds.
 * @param {string} [options.easing="linear"] - The name of the easing function: "lienar",
 *   "easeInQuad", "easeOutQuad", "easeInOutQuad", "easeInCubic", "easeOutCubic", "easeInOutCubic",
 *   "easeInQuart", "easeOutQuart", "easeInOutQuart", "easeInQuint", "easeOutQuint" or
 *   "easeInOutQuint".
 * @param {function} [options.callback] - A callback function that is called each time, scrollTop of
 *   the element was set.
 */
export const scrollTopDiff = (element, diff, { duration = 200, easing = 'linear', callback } = { duration: 200, easing: 'linear' }) => {
  scroll('top', element, diff, {
    isDiff: true, duration, easing, callback,
  });
};


/**
 * Exported function to scroll an element horizontal to a given position with easing animation.
 *
 * @param {Element} element - The HTML element to scroll.
 * @param {number} to - The absolute scroll value in pixels to scroll to.
 * @param {object} [options] - Optional options with default values.
 * @param {boolean} [options.isRtl=false] - Set to true, if the reading direction is right-to-left.
 * @param {number} [options.duration=200] - The scrolling time in milliseconds.
 * @param {string} [options.easing="linear"] - The name of the easing function: "lienar",
 *   "easeInQuad", "easeOutQuad", "easeInOutQuad", "easeInCubic", "easeOutCubic", "easeInOutCubic",
 *   "easeInQuart", "easeOutQuart", "easeInOutQuart", "easeInQuint", "easeOutQuint" or
 *   "easeInOutQuint".
 * @param {function} [options.callback] - A callback function that is called each time, scrollLeft
 *   of the element was set.
 */
export const scrollLeftTo = (element, to, {
  isRtl = false, duration = 200, easing = 'linear', callback,
} = { isRtl: false, duration: 200, easing: 'linear' }) => {
  scroll('left', element, to, {
    isRtl, duration, easing, callback,
  });
};


/**
 * Exported function to scroll an element horizontal for a given difference value with easing
 * animation.
 *
 * @param {Element} element - The HTML element to scroll.
 * @param {number} diff - The difference value in pixels to scroll.
 * @param {object} [options] - Optional options with default values.
 * @param {boolean} [options.isRtl=false] - Set to true, if the reading direction is right-to-left.
 * @param {number} [options.duration=200] - The scrolling time in milliseconds.
 * @param {string} [options.easing="linear"] - The name of the easing function: "lienar",
 *   "easeInQuad", "easeOutQuad", "easeInOutQuad", "easeInCubic", "easeOutCubic", "easeInOutCubic",
 *   "easeInQuart", "easeOutQuart", "easeInOutQuart", "easeInQuint", "easeOutQuint" or
 *   "easeInOutQuint".
 * @param {function} [options.callback] - A callback function that is called each time, scrollLeft
 *   of the element was set.
 */
export const scrollLeftDiff = (element, diff, {
  isRtl = false, duration = 200, easing = 'linear', callback,
} = { isRtl: false, duration: 200, easing: 'linear' }) => {
  scroll('left', element, diff, {
    isDiff: true, isRtl, duration, easing, callback,
  });
};
