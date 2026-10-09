const ITEMS = { wrap: 'Wrap', quote: 'Quote', unquote: 'Unquote', both: 'Wrap + Quote' };

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'mailformat', title: 'mailformat', contexts: ['editable'] });
  for (const [id, title] of Object.entries(ITEMS))
    chrome.contextMenus.create({ id, title, parentId: 'mailformat', contexts: ['editable'] });
});

async function run(target, mode) {
  const { width = 72 } = await chrome.storage.sync.get('width');
  await chrome.scripting.executeScript({ target, func: apply, args: [mode, width] });
}

chrome.contextMenus.onClicked.addListener((info, tab) =>
  run({ tabId: tab.id, frameIds: [info.frameId] }, info.menuItemId));

// From the toolbar popup, for sites that block the context menu.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) =>
    run({ tabId: tab.id, allFrames: true }, msg.mode).finally(sendResponse));
  return true;
});

// Injected into the page; must be self-contained.
function apply(mode, width) {
  const wrap = (text, w) => text.split('\n').map(line => {
    const prefix = line.match(/^(>[> ]*)?/)[0];
    const words = line.slice(prefix.length).split(/\s+/).filter(Boolean);
    if (!words.length) return line;
    const max = Math.max(1, w - prefix.length);
    const out = [];
    let cur = '';
    for (const word of words) {
      if (cur && cur.length + 1 + word.length > max) { out.push(cur); cur = word; }
      else cur = cur ? cur + ' ' + word : word;
    }
    out.push(cur);
    return out.map(l => prefix + l).join('\n');
  }).join('\n');

  const quote = text => text.split('\n')
    .map(l => l === '' ? '>' : l.startsWith('>') ? '>' + l : '> ' + l).join('\n');

  const unquote = text => text.split('\n').map(l => l.replace(/^> ?/, '')).join('\n');

  const el = document.activeElement;
  const text = el && 'selectionStart' in el && el.value !== undefined
    ? el.value.slice(el.selectionStart, el.selectionEnd)
    : getSelection().toString();
  if (!text) return;

  const out = mode === 'wrap' ? wrap(text, width)
    : mode === 'quote' ? quote(text)
    : mode === 'unquote' ? unquote(text)
    : quote(wrap(text, width - 2));

  el.focus();
  if (!document.execCommand('insertText', false, out) && el.setRangeText)
    el.setRangeText(out, el.selectionStart, el.selectionEnd, 'select');
}
