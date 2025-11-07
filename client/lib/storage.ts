// 创建一个自定义事件，用于传值
const storageChangeEvent = new Event('customStorageChange')

// 保存原始的 localStorage 方法
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;
const originalClear = localStorage.clear;

function initStorageListener() {
  localStorage.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    window.dispatchEvent(storageChangeEvent);
    console.log(`[Storage Listener] setItem: ${key}`);
  };

  localStorage.removeItem = function(key) {
    originalRemoveItem.call(this, key);
    window.dispatchEvent(storageChangeEvent);
    console.log(`[Storage Listener] removeItem: ${key}`);
  };

  localStorage.clear = function() {
    originalClear.call(this);
    window.dispatchEvent(storageChangeEvent);
    console.log(`[Storage Listener] clear`);
  };
}

export { initStorageListener, storageChangeEvent };