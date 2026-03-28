/**
 * Context Menu — right-click menu component.
 */
const ContextMenu = (() => {
  let _currentMenu = null;

  /**
   * Show a context menu at the given position.
   * @param {ShadowRoot} shadowRoot
   * @param {number} x - clientX
   * @param {number} y - clientY
   * @param {Array<{label: string, icon?: string, action: Function, danger?: boolean} | 'separator'>} items
   */
  function show(shadowRoot, x, y, items) {
    hide(); // Close any existing menu

    const menu = DOM.create('div', { className: 'acf-context-menu' });

    for (const item of items) {
      if (item === 'separator') {
        menu.appendChild(DOM.create('div', { className: 'acf-context-menu__separator' }));
        continue;
      }

      const children = [];
      if (item.icon) {
        children.push(SVGIcons.createIcon(item.icon, 14));
      }
      children.push(document.createTextNode(item.label));

      const menuItem = DOM.create('div', {
        className: `acf-context-menu__item ${item.danger ? 'acf-context-menu__item--danger' : ''}`,
        onClick: (e) => {
          e.stopPropagation();
          hide();
          item.action();
        }
      }, children);

      menu.appendChild(menuItem);
    }

    // Position the menu, adjusting to stay within viewport
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    shadowRoot.appendChild(menu);
    _currentMenu = menu;

    // Adjust position if overflows viewport
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menu.style.left = (x - rect.width) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = (y - rect.height) + 'px';
      }
    });

    // Close on outside click
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        hide();
        document.removeEventListener('click', closeHandler, true);
        document.removeEventListener('contextmenu', closeHandler, true);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeHandler, true);
      document.addEventListener('contextmenu', closeHandler, true);
    }, 10);

    // Close on ESC
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        hide();
        document.removeEventListener('keydown', keyHandler);
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  /**
   * Hide the current context menu.
   */
  function hide() {
    if (_currentMenu && _currentMenu.parentNode) {
      _currentMenu.parentNode.removeChild(_currentMenu);
    }
    _currentMenu = null;
  }

  return { show, hide };
})();
