const input = document.getElementById('width');
chrome.storage.sync.get({ width: 72 }, ({ width }) => input.value = width);
document.getElementById('save').onclick = () => {
  const width = parseInt(input.value, 10) || 72;
  chrome.storage.sync.set({ width }, () => {
    document.getElementById('status').textContent = 'Saved.';
  });
};
