/**
 * DOM utility functions for creating and querying elements.
 */
const DOM = {
  /**
   * Create an element with attributes and children.
   * @param {string} tag
   * @param {Object} attrs - { className, id, textContent, dataset, style, ... }
   * @param {Array<Node|string>} children
   * @returns {HTMLElement}
   */
  create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'textContent') {
        el.textContent = value;
      } else if (key === 'innerHTML') {
        el.innerHTML = value;
      } else if (key === 'dataset') {
        for (const [dk, dv] of Object.entries(value)) {
          el.dataset[dk] = dv;
        }
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }
    return el;
  },

  /**
   * Query a single element within a root.
   * @param {string} selector
   * @param {Element|Document|ShadowRoot} root
   * @returns {Element|null}
   */
  qs(selector, root = document) {
    return root.querySelector(selector);
  },

  /**
   * Query all elements within a root.
   * @param {string} selector
   * @param {Element|Document|ShadowRoot} root
   * @returns {Element[]}
   */
  qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  },

  /**
   * Remove all children of an element.
   * @param {Element} el
   */
  empty(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  },

  /**
   * Insert element after a reference node.
   * @param {Node} newNode
   * @param {Node} referenceNode
   */
  insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }
};
