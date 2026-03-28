/**
 * Search Bar — search input with debounced query and results display.
 */
const SearchBarComponent = (() => {
  /**
   * Create the search bar DOM element.
   * @param {Object} options
   * @param {Function} options.onSearch - (query: string) => void
   * @param {Function} options.onClear - () => void
   * @returns {HTMLElement}
   */
  function create(options = {}) {
    const { onSearch, onClear } = options;

    const wrapper = DOM.create('div', { className: 'acf-search' });

    const inputWrapper = DOM.create('div', { className: 'acf-search__input-wrapper' });

    const searchIcon = SVGIcons.createIcon('search', 14);
    searchIcon.style.color = 'var(--acf-text-tertiary)';
    searchIcon.style.flexShrink = '0';

    const input = DOM.create('input', {
      className: 'acf-search__input',
      type: 'text',
      placeholder: i18n.t('searchPlaceholder')
    });

    const clearBtn = SVGIcons.createIcon('close', 12, 'acf-search__clear');
    clearBtn.style.cursor = 'pointer';

    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(clearBtn);
    wrapper.appendChild(inputWrapper);

    // Debounced search
    const debouncedSearch = debounce((query) => {
      if (onSearch) onSearch(query);
    }, 300);

    input.addEventListener('input', () => {
      const value = input.value.trim();
      if (value) {
        inputWrapper.classList.add('has-value');
      } else {
        inputWrapper.classList.remove('has-value');
      }
      debouncedSearch(value);
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      inputWrapper.classList.remove('has-value');
      if (onClear) onClear();
      input.focus();
    });

    // Expose methods
    wrapper._input = input;
    wrapper.getValue = () => input.value.trim();
    wrapper.setValue = (val) => {
      input.value = val;
      if (val) {
        inputWrapper.classList.add('has-value');
      } else {
        inputWrapper.classList.remove('has-value');
      }
    };
    wrapper.focus = () => input.focus();

    return wrapper;
  }

  return { create };
})();
