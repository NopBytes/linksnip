// LinkSnip – Popup Script

const btn    = document.getElementById('snip-btn');
const status = document.getElementById('status');

function setStatus(msg, type = '') {
  status.textContent = msg;
  status.className   = type;
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  setStatus('Activating snip mode…', '');

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    setStatus('⚠️ Cannot access this tab.', 'error');
    btn.disabled = false;
    return;
  }

  // Ensure the content script is injected (handles edge cases like fresh tabs)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css'],
    });
  } catch (_) {
    // Already injected — that's fine
  }

  // Tell the content script to start snipping
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'startSnip' });
    setStatus('✂️ Drag to select an area on the page', 'success');
    // Close popup so the user can see the page
    setTimeout(() => window.close(), 400);
  } catch (err) {
    setStatus('⚠️ Could not activate on this page.', 'error');
    btn.disabled = false;
  }
});
