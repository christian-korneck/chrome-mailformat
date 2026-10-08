const ITEMS = { wrap: 'Wrap', quote: 'Quote', both: 'Wrap + Quote' };

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'mailformat', title: 'mailformat', contexts: ['editable'] });
  for (const [id, title] of Object.entries(ITEMS))
    chrome.contextMenus.create({ id, title, parentId: 'mailformat', contexts: ['editable'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { width = 72 } = await chrome.storage.sync.get('width');
  chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [info.frameId] },
    func: apply,
    args: [info.menuItemId, width],
  });
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

  const el = document.activeElement;
  const text = el && 'selectionStart' in el && el.value !== undefined
    ? el.value.slice(el.selectionStart, el.selectionEnd)
    : getSelection().toString();
  if (!text) return;

  const out = mode === 'wrap' ? wrap(text, width)
    : mode === 'quote' ? quote(text)
    : quote(wrap(text, width - 2));

  if (!document.execCommand('insertText', false, out) && el.setRangeText)
    el.setRangeText(out, el.selectionStart, el.selectionEnd, 'select');
}
