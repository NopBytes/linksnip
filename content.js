// LinkSnip Content Script
// Handles the selection overlay, rectangle drawing, and link extraction

(function () {
  let isSnipping = false;
  let overlay = null;
  let selectionBox = null;
  let startX = 0, startY = 0;
  let animFrameId = null;

  // ── Inject overlay ──────────────────────────────────────────────────────────
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'linksnip-overlay';

    selectionBox = document.createElement('div');
    selectionBox.id = 'linksnip-selection';

    const instructions = document.createElement('div');
    instructions.id = 'linksnip-instructions';
    instructions.textContent = 'Drag to select an area  ·  Esc to cancel';

    overlay.appendChild(selectionBox);
    overlay.appendChild(instructions);
    document.body.appendChild(overlay);

    overlay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
  }

  function removeOverlay() {
    if (overlay) {
      overlay.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      overlay = null;
      selectionBox = null;
    }
    isSnipping = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
  }

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  function onMouseDown(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left   = startX + 'px';
    selectionBox.style.top    = startY + 'px';
    selectionBox.style.width  = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    selectionBox.style.left   = x + 'px';
    selectionBox.style.top    = y + 'px';
    selectionBox.style.width  = w + 'px';
    selectionBox.style.height = h + 'px';
  }

  function onMouseUp(e) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    const rect = {
      left:   parseInt(selectionBox.style.left),
      top:    parseInt(selectionBox.style.top),
      right:  parseInt(selectionBox.style.left) + parseInt(selectionBox.style.width),
      bottom: parseInt(selectionBox.style.top)  + parseInt(selectionBox.style.height),
    };

    if (rect.right - rect.left < 5 || rect.bottom - rect.top < 5) {
      // Too small – cancel silently
      removeOverlay();
      return;
    }

    const links = getLinksInRect(rect);
    removeOverlay();
    showResultToast(links);

    if (links.length > 0) {
      chrome.runtime.sendMessage({ action: 'openLinks', urls: links });
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') removeOverlay();
  }

  // ── Link extraction ─────────────────────────────────────────────────────────
  function getLinksInRect(rect) {
    const anchors = document.querySelectorAll('a[href]');
    const found   = new Set();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    anchors.forEach(a => {
      const href = a.href;
      if (!href || href.startsWith('javascript:') || href === '#') return;

      // Check every client rect of the element (handles wrapped text)
      const clientRects = a.getClientRects();
      for (const cr of clientRects) {
        // cr is in viewport coords; rect is also in viewport coords
        const overlaps =
          cr.left   < rect.right  &&
          cr.right  > rect.left   &&
          cr.top    < rect.bottom &&
          cr.bottom > rect.top;

        if (overlaps) {
          found.add(href);
          break;
        }
      }
    });

    return [...found];
  }

  // ── Toast notification ──────────────────────────────────────────────────────
  function showResultToast(links) {
    const existing = document.getElementById('linksnip-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'linksnip-toast';

    if (links.length === 0) {
      toast.innerHTML = `<span class="linksnip-toast-icon">🔍</span> No links found in selection`;
      toast.classList.add('linksnip-toast-empty');
    } else {
      toast.innerHTML = `<span class="linksnip-toast-icon">🚀</span> Opening <strong>${links.length}</strong> link${links.length !== 1 ? 's' : ''} in new tabs`;
    }

    document.body.appendChild(toast);

    // Animate out
    setTimeout(() => toast.classList.add('linksnip-toast-fade'), 2500);
    setTimeout(() => toast.remove(), 3200);
  }

  // ── Message listener (triggered from popup) ─────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'startSnip') {
      if (!isSnipping) {
        isSnipping = true;
        createOverlay();
      }
      sendResponse({ status: 'ok' });
    }
  });
})();
