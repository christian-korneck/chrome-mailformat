for (const b of document.querySelectorAll('button'))
  b.onclick = () => chrome.runtime.sendMessage({ mode: b.dataset.mode }, () => window.close());
