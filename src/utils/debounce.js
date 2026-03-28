/**
 * Debounce and throttle utilities.
 */

/**
 * Debounce a function — only execute after `delay` ms of inactivity.
 * @param {Function} fn
 * @param {number} delay - milliseconds
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function — execute at most once every `interval` ms.
 * @param {Function} fn
 * @param {number} interval - milliseconds
 * @returns {Function}
 */
function throttle(fn, interval) {
  let lastTime = 0;
  let timer = null;
  return function (...args) {
    const now = Date.now();
    const remaining = interval - (now - lastTime);
    clearTimeout(timer);
    if (remaining <= 0) {
      lastTime = now;
      fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        lastTime = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}
