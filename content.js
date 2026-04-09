// 默认配置常量
const DEFAULT_CONFIG = {
  fontFamily: 'system-ui, -apple-system, "Microsoft YaHei", sans-serif',
  mode: 'blacklist',
  blacklist: [],
  whitelist:[]
};

// 核心逻辑：根据配置决定注入、更新或移除字体
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

// 初始化执行
chrome.storage.local.get(DEFAULT_CONFIG, applyOrRemoveFont);

// [!] 监听存储变化，实现无刷新实时更新
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    chrome.storage.local.get(DEFAULT_CONFIG, applyOrRemoveFont);
  }
});

// 移除字体样式（当切换到黑名单或移除白名单时触发）
function removeFontCss() {
  const styleEl = document.getElementById('edge-font-customizer-style');
  if (styleEl) styleEl.remove();
}

function injectFontCss(fontFamily) {
  // 确保字体名称包含空格时被正确解析，防止 CSS 语法错误
  const safeFontFamily = fontFamily.includes(' ') && !fontFamily.startsWith('"') ? `"${fontFamily}"` : fontFamily;
  const cssContent = `
    *:not(i):not([class*="icon"]):not([class*="fa"]):not([class*="iconfont"]):not([class*="material-icons"]):not([class*="bi-"]):not([class*="mdi-"]):not([class*="nf-"]) {
      font-family: ${safeFontFamily}, system-ui, sans-serif !important;
    }
  `;

  let styleEl = document.getElementById('edge-font-customizer-style');
  
  // [!] 如果已存在样式标签，直接更新内容实现无刷新替换
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