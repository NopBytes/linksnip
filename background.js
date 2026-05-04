// LinkSnip – Background Service Worker

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'openLinks' && Array.isArray(msg.urls)) {
    const urls = msg.urls.slice(0, 50); // safety cap – max 50 tabs at once

    urls.forEach((url, i) => {
      // Stagger slightly so Chrome doesn't throttle
      setTimeout(() => {
        chrome.tabs.create({ url, active: false });
      }, i * 80);
    });

    sendResponse({ opened: urls.length });
  }
});
