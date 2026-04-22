const DEFAULT_CONFIG = {
  fontFamily: 'system-ui, -apple-system, "Microsoft YaHei", sans-serif',
  mode: 'blacklist',
  blacklist: [],
  whitelist:[]
};

function applyOrRemoveFont(config) {
  const currentHost = window.location.hostname;
  let shouldApplyFont = false;
  if (config.mode === 'blacklist') {
    shouldApplyFont = !config.blacklist.includes(currentHost);
  } else if (config.mode === 'whitelist') {
    shouldApplyFont = config.whitelist.includes(currentHost);
  }
  if (shouldApplyFont && config.fontFamily) {
    injectFontCss(config.fontFamily);
  } else {
    removeFontCss();
  }
}

chrome.storage.local.get(DEFAULT_CONFIG, applyOrRemoveFont);

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    chrome.storage.local.get(DEFAULT_CONFIG, applyOrRemoveFont);
  }
});

function removeFontCss() {
  const styleEl = document.getElementById('edge-font-customizer-style');
  if (styleEl) styleEl.remove();
}

function injectFontCss(fontFamily) {
  const safeFontFamily = fontFamily.includes(' ') && !fontFamily.startsWith('"') ? `"${fontFamily}"` : fontFamily;
  const cssContent = `
    *:not(i):not([class*="icon"]):not([class*="fa"]):not([class*="iconfont"]):not([class*="material-icons"]):not([class*="bi-"]):not([class*="mdi-"]):not([class*="nf-"]) {
      font-family: ${safeFontFamily}, system-ui, sans-serif !important;
    }
  `;
  let styleEl = document.getElementById('edge-font-customizer-style');
  if (styleEl) {
    styleEl.textContent = cssContent;
    return;
  }
  styleEl = document.createElement('style');
  styleEl.id = 'edge-font-customizer-style';
  styleEl.textContent = cssContent;
  const insertStyle = () => {
    if (document.head) {
      document.head.appendChild(styleEl);
    } else if (document.documentElement) {
      document.documentElement.appendChild(styleEl);
    }
  };
  if (document.documentElement || document.head) {
    insertStyle();
  } else {
    const observer = new MutationObserver(() => {
      if (document.documentElement || document.head) {
        insertStyle();
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }
}