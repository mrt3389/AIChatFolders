/**
 * Drag and Drop Manager — orchestrates drag-and-drop within the sidebar.
 */
const DragDropManager = (() => {
  let _shadowRoot = null;
  let _dragData = null; // { type: 'conversation'|'folder', ids: string[], element: Element }
  let _ghost = null;
  let _currentDropTarget = null;
  let _onDrop = null;
  let _scrollInterval = null;

  /**
   * Initialize the drag-and-drop system.
   * @param {ShadowRoot} shadowRoot
   * @param {Function} onDrop - ({ type, ids, targetFolderId, targetOrder }) => void
   */
  function init(shadowRoot, onDrop) {
    _shadowRoot = shadowRoot;
    _onDrop = onDrop;

    // These events are added on the shadow root to capture all drag operations
    shadowRoot.addEventListener('dragstart', _handleDragStart, true);
    shadowRoot.addEventListener('dragend', _handleDragEnd, true);
    shadowRoot.addEventListener('dragover', _handleDragOver, true);
    shadowRoot.addEventListener('dragenter', _handleDragEnter, true);
    shadowRoot.addEventListener('dragleave', _handleDragLeave, true);
    shadowRoot.addEventListener('drop', _handleDrop, true);
    
    console.log('[汇聊] DragDropManager initialized');
  }

  function destroy() {
    if (_shadowRoot) {
      _shadowRoot.removeEventListener('dragstart', _handleDragStart, true);
      _shadowRoot.removeEventListener('dragend', _handleDragEnd, true);
      _shadowRoot.removeEventListener('dragover', _handleDragOver, true);
      _shadowRoot.removeEventListener('dragenter', _handleDragEnter, true);
      _shadowRoot.removeEventListener('dragleave', _handleDragLeave, true);
      _shadowRoot.removeEventListener('drop', _handleDrop, true);
    }
    _removeGhost();
    _shadowRoot = null;
    _onDrop = null;
  }

  function _handleDragStart(e) {
    // 确保事件目标在我们的组件内
    if (!_shadowRoot.contains(e.target)) return;
    
    const convEl = e.target.closest('.acf-conv');
    const folderEl = e.target.closest('.acf-folder__row');

    if (convEl) {
      const convId = convEl.dataset.conversationId;
      if (!convId) {
        console.warn('[汇聊] No conversation ID on drag element');
        return;
      }
      
      // Check for multi-select
      const selected = _shadowRoot.querySelectorAll('.acf-conv--selected');
      let ids;
      if (selected.length > 1 && convEl.classList.contains('acf-conv--selected')) {
        ids = Array.from(selected).map(el => el.dataset.conversationId);
      } else {
        ids = [convId];
      }

      _dragData = { type: 'conversation', ids, element: convEl };
      convEl.classList.add('acf-conv--dragging');

      // Set drag data for the browser
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'conversation', ids }));
      
      console.log('[汇聊] Drag started for conversation:', ids);

      // Create ghost
      const title = convEl.querySelector('.acf-conv__title')?.textContent || '';
      _createGhost(title, ids.length);

      // Use custom ghost as drag image (create off-screen element)
      const dragImage = DOM.create('div', {
        style: {
          position: 'fixed',
          top: '-1000px',
          left: '-1000px',
          background: 'var(--acf-accent)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap'
        },
        textContent: ids.length > 1 ? `${ids.length} 个对话` : title
      });
      _shadowRoot.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => dragImage.remove(), 0);

    } else if (folderEl) {
      const folderId = folderEl.closest('.acf-folder')?.dataset.folderId;
      if (folderId) {
        _dragData = { type: 'folder', ids: [folderId], element: folderEl };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', ids: [folderId] }));
        console.log('[汇聊] Drag started for folder:', folderId);
      }
    }
  }

  function _handleDragEnd(e) {
    _stopScrolling();
    if (_dragData && _dragData.element) {
      _dragData.element.classList.remove('acf-conv--dragging');
    }
    _dragData = null;
    _removeGhost();
    _clearAllDropTargets();
    console.log('[汇聊] Drag ended');
  }

  function _handleDragOver(e) {
    if (!_dragData) return;

    const dropTarget = _findDropTarget(e.target);
    if (dropTarget) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }

    // Update ghost position
    if (_ghost) {
      _ghost.style.display = 'block';
      _ghost.style.left = (e.clientX + 12) + 'px';
      _ghost.style.top = (e.clientY + 12) + 'px';
    }
    
    // Auto-scroll when near edges
    _handleAutoScroll(e);
  }
  
  function _handleAutoScroll(e) {
    const contentEl = _shadowRoot.querySelector('.acf-content');
    if (!contentEl) return;
    
    const rect = contentEl.getBoundingClientRect();
    const scrollThreshold = 30;
    const scrollSpeed = 5;
    
    _stopScrolling();
    
    if (e.clientY < rect.top + scrollThreshold) {
      _scrollInterval = setInterval(() => {
        contentEl.scrollTop -= scrollSpeed;
      }, 16);
    } else if (e.clientY > rect.bottom - scrollThreshold) {
      _scrollInterval = setInterval(() => {
        contentEl.scrollTop += scrollSpeed;
      }, 16);
    }
  }
  
  function _stopScrolling() {
    if (_scrollInterval) {
      clearInterval(_scrollInterval);
      _scrollInterval = null;
    }
  }

  function _handleDragEnter(e) {
    if (!_dragData) return;

    const dropTarget = _findDropTarget(e.target);
    if (dropTarget && dropTarget !== _currentDropTarget) {
      _clearAllDropTargets();
      dropTarget.classList.add('acf-drag-over');
      _currentDropTarget = dropTarget;
    }
  }

  function _handleDragLeave(e) {
    const dropTarget = _findDropTarget(e.target);
    if (dropTarget) {
      // Only remove if truly leaving (not entering a child)
      const related = e.relatedTarget;
      if (!dropTarget.contains(related)) {
        dropTarget.classList.remove('acf-drag-over');
        if (_currentDropTarget === dropTarget) {
          _currentDropTarget = null;
        }
      }
    }
  }

  function _handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    _stopScrolling();
    
    if (!_dragData || !_onDrop) {
      console.log('[汇聊] Drop ignored: no drag data or callback');
      return;
    }

    const dropTarget = _findDropTarget(e.target);
    if (!dropTarget) {
      console.log('[汇聊] Drop ignored: no valid target');
      _clearAllDropTargets();
      _dragData = null;
      _removeGhost();
      return;
    }

    const targetFolderId = dropTarget.closest('.acf-folder')?.dataset.folderId || null;
    
    console.log('[汇聊] Drop on folder:', targetFolderId, 'type:', _dragData.type, 'ids:', _dragData.ids);

    _onDrop({
      type: _dragData.type,
      ids: _dragData.ids,
      targetFolderId
    });

    _clearAllDropTargets();
    _dragData = null;
    _removeGhost();
  }

  function _findDropTarget(el) {
    if (!el || !_shadowRoot.contains(el)) return null;
    
    // Walk up to find a valid drop target (folder row)
    const folderRow = el.closest('.acf-folder__row');
    if (folderRow) return folderRow;

    // Also allow dropping on the folder container itself
    const folder = el.closest('.acf-folder');
    if (folder) {
      const row = folder.querySelector('.acf-folder__row');
      return row || folder;
    }

    // Dropping on the unfiled section
    const section = el.closest('.acf-section');
    if (section && section.dataset.section === 'unfiled') return section;

    return null;
  }

  function _createGhost(title, count) {
    _removeGhost();
    _ghost = DOM.create('div', { className: 'acf-drag-ghost' }, [
      document.createTextNode(title)
    ]);
    if (count > 1) {
      const badge = DOM.create('span', {
        className: 'acf-drag-ghost__badge',
        textContent: String(count)
      });
      _ghost.appendChild(badge);
    }
    _ghost.style.display = 'none'; // Hidden until first dragover
    _shadowRoot.appendChild(_ghost);
  }

  function _removeGhost() {
    if (_ghost && _ghost.parentNode) {
      _ghost.parentNode.removeChild(_ghost);
    }
    _ghost = null;
  }

  function _clearAllDropTargets() {
    if (!_shadowRoot) return;
    const targets = _shadowRoot.querySelectorAll('.acf-drag-over');
    targets.forEach(t => t.classList.remove('acf-drag-over'));
    _currentDropTarget = null;
  }

  function destroy() {
    _stopScrolling();
    if (_shadowRoot) {
      _shadowRoot.removeEventListener('dragstart', _handleDragStart, true);
      _shadowRoot.removeEventListener('dragend', _handleDragEnd, true);
      _shadowRoot.removeEventListener('dragover', _handleDragOver, true);
      _shadowRoot.removeEventListener('dragenter', _handleDragEnter, true);
      _shadowRoot.removeEventListener('dragleave', _handleDragLeave, true);
      _shadowRoot.removeEventListener('drop', _handleDrop, true);
    }
    _removeGhost();
    _shadowRoot = null;
    _onDrop = null;
  }

  return { init, destroy };
})();
